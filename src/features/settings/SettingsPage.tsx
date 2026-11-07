import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../../components/m3'
import { useToast } from '../../components/shared/Toast'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { PageHeader } from '../../components/ui/PageHeader'
import { db, resetLocalData } from '../../lib/db/schema'
import { listAllCoverage } from '../../lib/db/repositories/coverage'
import { listMembers } from '../../lib/db/repositories/members'
import { listFinalOutings } from '../../lib/db/repositories/outings'
import { listSettlements } from '../../lib/db/repositories/settlements'
import { listAllShares } from '../../lib/db/repositories/shares'
import { listStudents } from '../../lib/db/repositories/students'
import { isDemoMode, setCurrentMemberId, signOut } from '../../lib/platform/auth'
import { downloadText } from '../../lib/platform/share'
import { useCurrentMemberId } from '../auth/useCurrentMember'

export function SettingsPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const currentMemberId = useCurrentMemberId()
  const members = useLiveQuery(() => listMembers(), []) ?? []
  const groupNameRow = useLiveQuery(() => db.meta.get('groupName'), [])
  const [groupName, setGroupName] = useState(groupNameRow?.value ?? 'Salo')

  useEffect(() => {
    if (groupNameRow?.value) setGroupName(groupNameRow.value)
  }, [groupNameRow?.value])

  const currentMember = members.find((member) => member.id === currentMemberId)

  const saveGroupName = async () => {
    await db.meta.put({ key: 'groupName', value: groupName.trim() || 'Salo' })
    showToast('Group name saved', 'success')
  }

  const exportAll = async () => {
    const [students, outings, coverage, shares, settlements] = await Promise.all([
      listStudents(),
      listFinalOutings(),
      listAllCoverage(),
      listAllShares(),
      listSettlements()
    ])
    const payload = {
      exportedAt: new Date().toISOString(),
      group: groupName,
      members,
      students,
      outings,
      coverage,
      shares,
      settlements
    }
    downloadText(
      JSON.stringify(payload, null, 2),
      `salo-backup-${new Date().toISOString().slice(0, 10)}.json`,
      'application/json'
    )
    showToast('Backup downloaded', 'success')
  }

  const handleReset = async () => {
    if (
      !window.confirm(
        'Remove all local students, outings, receipts, and settlements from this device? This cannot be undone.'
      )
    ) {
      return
    }
    await resetLocalData()
    setCurrentMemberId(null)
    showToast('Local data cleared', 'success')
    navigate('/')
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <div>
      <PageHeader title="Settings" subtitle="Group, install, and data." />

      <div className="space-y-4">
        <Card>
          <div className="flex items-center gap-3">
            <Avatar name={currentMember?.name ?? '?'} order={currentMember?.order} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="m3-title-medium">{currentMember?.name ?? 'Not signed in'}</p>
              <p className="truncate m3-body-small text-on-surface-variant">{currentMember?.email ?? ''}</p>
              <p className="mt-1 m3-label-small uppercase tracking-[0.14em] text-on-surface-variant">
                {isDemoMode() ? 'Local demo mode' : 'Google account'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void handleSignOut()}>
              <span slot="icon">
                <Icon>logout</Icon>
              </span>
              Sign out
            </Button>
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="m3-title-medium">Group</h2>
          <div className="space-y-2">
            <Input
              label="Group name"
              value={groupName}
              onChange={(event) => setGroupName(event.target.value)}
            />
            <div className="flex justify-end">
              <Button variant="text" onClick={() => void saveGroupName()}>
                Save name
              </Button>
            </div>
          </div>
          <div className="space-y-2 pt-1">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                onClick={() => {
                  setCurrentMemberId(member.id)
                  showToast(`Switched to ${member.name}`, 'info')
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left text-sm ${
                  member.id === currentMemberId
                    ? 'border-primary bg-primary-container/60'
                    : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container/60'
                }`}
              >
                <Avatar name={member.name} order={member.order} size="sm" />
                <span className="flex-1 font-semibold">{member.name}</span>
                <span className="m3-body-small text-on-surface-variant">{member.email}</span>
              </button>
            ))}
          </div>
          <p className="m3-body-small leading-relaxed text-on-surface-variant">
            All four adults share the same ledger. In demo mode, switching profiles lets you test
            the app from each adult's point of view.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="m3-title-medium flex items-center gap-2">
            <Icon>smartphone</Icon>
            Install Salo
          </h2>
          <div className="rounded-2xl bg-surface-container p-3 m3-body-medium text-on-surface-variant">
            <p className="font-semibold text-on-surface">iPhone</p>
            <p className="mt-1 text-xs leading-relaxed">
              Open this site in Safari → tap Share → Add to Home Screen. The app opens standalone
              and works offline after the first load.
            </p>
          </div>
          <div className="rounded-2xl bg-surface-container p-3 m3-body-medium text-on-surface-variant">
            <p className="font-semibold text-on-surface">Android</p>
            <p className="mt-1 text-xs leading-relaxed">
              Use Chrome's Install app action, or install the signed APK when it is available. No
              Play Store listing is required.
            </p>
          </div>
          <div className="flex items-center gap-2 m3-body-small text-on-surface-variant">
            <Icon>share</Icon>
            Recaps can be shared as text or an image.
          </div>
        </Card>

        <Card className="space-y-3">
          <h2 className="m3-title-medium">Data</h2>
          <Button variant="secondary" fullWidth onClick={() => void exportAll()}>
            <span slot="icon">
              <Icon>download</Icon>
            </span>
            Export all data (JSON)
          </Button>
          <Button variant="ghost" fullWidth onClick={() => void handleReset()}>
            <span slot="icon">
              <Icon>delete</Icon>
            </span>
            Clear local data
          </Button>
          <p className="m3-body-small leading-relaxed text-on-surface-variant">
            Receipt OCR stays on this device. Receipt photos are stored locally in this demo; the
            Supabase sync layer is scaffolded but not connected until environment values are added.
          </p>
        </Card>

        <Card className="space-y-2">
          <h2 className="m3-title-medium flex items-center gap-2">
            <Icon>info</Icon>
            About
          </h2>
          <p className="m3-body-small leading-relaxed text-on-surface-variant">
            Salo is a private per-head meal ledger for CP, Mai, Kent, and Llanmer. Money is stored in integer
            centavos; every finalized split sums exactly to the receipt total.
          </p>
          <p className="m3-body-small text-on-surface-variant">Version 0.1.0 · Spec 001-salo-expense-sharing</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <span slot="icon">
              <Icon>refresh</Icon>
            </span>
            Reload app
          </Button>
        </Card>
      </div>
    </div>
  )
}
