import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Icon, IconButton } from '../../components/m3'
import { useToast } from '../../components/shared/Toast'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Money } from '../../components/ui/Money'
import { PageHeader } from '../../components/ui/PageHeader'
import { getOutingBundle, softDeleteOuting } from '../../lib/db/repositories/outings'
import { formatCentavos } from '../../lib/money/centavos'
import { copyText, downloadBlob, shareImage, shareText } from '../../lib/platform/share'
import { buildRecapText, outingDateLabel, recapFilename } from './recap'
import { renderRecapImage } from './recapImage'

export function OutingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [sharingImage, setSharingImage] = useState(false)

  const bundle = useLiveQuery(
    () => (id ? getOutingBundle(id) : Promise.resolve(null)),
    [id]
  )

  if (bundle === undefined) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-outline-variant border-t-accent" />
      </div>
    )
  }

  if (!bundle) {
    return (
      <EmptyState
        title="Outing not found"
        description="It may have been removed from this device."
        action={
          <Button size="sm" onClick={() => navigate('/')}>
            Back home
          </Button>
        }
      />
    )
  }

  const { outing, receipt, items, members, students, coverage, shares } = bundle
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]))
  const studentsById = Object.fromEntries(students.map((student) => [student.id, student]))
  const payer = membersById[outing.payerId]
  const orderedShares = members
    .map((member) => shares.find((share) => share.memberId === member.id))
    .filter(Boolean)

  const coverageByMember = members.map((member) => ({
    member,
    covered: coverage
      .filter((item) => item.memberId === member.id)
      .map((item) => studentsById[item.studentId]?.name)
      .filter(Boolean)
  }))

  const handleShare = async () => {
    const shared = await shareText(buildRecapText(bundle))
    showToast(shared ? 'Recap shared or copied' : 'Could not share the recap', shared ? 'success' : 'error')
  }

  const handleCopy = async () => {
    const copied = await copyText(buildRecapText(bundle))
    showToast(copied ? 'Recap copied' : 'Could not copy the recap', copied ? 'success' : 'error')
  }

  const handleImage = async () => {
    setSharingImage(true)
    try {
      const blob = await renderRecapImage(bundle)
      const filename = recapFilename(bundle)
      const shared =
        typeof navigator.canShare === 'function'
          ? await Promise.race([
              shareImage(blob, filename, buildRecapText(bundle)),
              new Promise<boolean>((resolve) => {
                window.setTimeout(() => resolve(false), 2500)
              })
            ])
          : false
      if (!shared) downloadBlob(blob, filename)
      showToast(shared ? 'Recap image shared' : 'Recap image saved', 'success')
    } catch (caught) {
      showToast(caught instanceof Error ? caught.message : 'Could not create the recap image', 'error')
    } finally {
      setSharingImage(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Remove this outing from the ledger? This keeps the receipt data on this device.')) {
      return
    }
    await softDeleteOuting(outing.id)
    showToast('Outing removed', 'success')
    navigate('/')
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={outing.place || 'Meal'}
        subtitle={`${outingDateLabel(outing.date)} · paid by ${payer?.name ?? '—'}`}
        backTo="/"
        action={
          <IconButton aria-label="Remove outing" onClick={() => void handleDelete()}>
            <Icon>delete</Icon>
          </IconButton>
        }
      />

      <Card variant="primary">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="m3-label-medium uppercase tracking-[0.16em] text-on-primary-container/70">
              Total
            </p>
            <Money
              centavos={outing.totalCentavos}
              size="xl"
              className="mt-2 block text-on-primary-container"
            />
            <p className="m3-body-small mt-2 text-on-primary-container/70">
              {outing.headcount} heads · {formatCentavos(outing.perHeadCentavos)} per head
            </p>
          </div>
          <div className="rounded-full bg-on-primary-container/10 p-3">
            <Icon>receipt_long</Icon>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="tonal" onClick={() => void handleShare()}>
          <span slot="icon">
            <Icon>share</Icon>
          </span>
          Share text
        </Button>
        <Button variant="outlined" onClick={() => void handleImage()} disabled={sharingImage}>
          <span slot="icon">
            <Icon>download</Icon>
          </span>
          {sharingImage ? 'Rendering…' : 'Save image'}
        </Button>
        <Button variant="text" onClick={() => void handleCopy()} className="col-span-2">
          <span slot="icon">
            <Icon>content_copy</Icon>
          </span>
          Copy recap
        </Button>
      </div>

      <Card>
        <h2 className="m3-title-medium">The split</h2>
        <div className="mt-3 space-y-3">
          {orderedShares.map((share) => {
            const member = membersById[share!.memberId]
            return (
              <div key={share!.memberId} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2">
                  <Avatar name={member?.name ?? '?'} order={member?.order} size="sm" />
                  <span>
                    <span className="block m3-title-small">{member?.name ?? '—'}</span>
                    <span className="block m3-body-small text-on-surface-variant">
                      self + {share!.coveredStudents}{' '}
                      {share!.coveredStudents === 1 ? 'student' : 'students'}
                      {share!.isPayer ? ' · paid' : ''}
                    </span>
                  </span>
                </span>
                <Money centavos={share!.amountCentavos} className="font-semibold" />
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h2 className="m3-title-medium">Coverage</h2>
        <div className="mt-3 space-y-2">
          {coverageByMember.map(({ member, covered }) => (
            <div key={member.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="flex items-center gap-2">
                <Avatar name={member.name} order={member.order} size="sm" />
                {member.name}
              </span>
              <span className="text-right text-on-surface-variant">
                {covered.length > 0 ? covered.join(', ') : 'none'}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="m3-title-medium">Settle up</h2>
        {shares.filter((share) => !share.isPayer).length > 0 ? (
          <div className="mt-3 space-y-2">
            {shares
              .filter((share) => !share.isPayer && share.amountCentavos > 0)
              .map((share) => (
                <div key={share.memberId} className="flex items-center justify-between text-sm">
                  <span className="text-on-surface-variant">
                    {membersById[share.memberId]?.name ?? '—'} → {payer?.name ?? '—'}
                  </span>
                  <Money centavos={share.amountCentavos} className="font-semibold" />
                </div>
              ))}
          </div>
        ) : (
          <p className="mt-2 m3-body-medium text-on-surface-variant">No transfers needed.</p>
        )}
      </Card>

      {receipt ? (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="m3-title-medium">Receipt</h2>
            <span className="m3-label-small uppercase tracking-[0.14em] text-on-surface-variant">
              {receipt.ocrEngine === 'manual' ? 'Manual' : 'On-device scan'}
            </span>
          </div>
          {receipt.imageDataUrl ? (
            <img
              src={receipt.imageDataUrl}
              alt="Receipt"
              className="max-h-72 w-full rounded-2xl border border-outline-variant object-contain"
            />
          ) : null}
          {receipt.merchant ? (
            <p className="m3-body-medium text-on-surface-variant">{receipt.merchant}</p>
          ) : null}
          {items.length > 0 ? (
            <div className="divide-y divide-line/70 rounded-2xl border border-outline-variant bg-surface-container-lowest">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 truncate">{item.description}</span>
                  <Money centavos={item.lineTotalCentavos} className="shrink-0 text-xs" />
                </div>
              ))}
            </div>
          ) : (
            <p className="m3-body-small text-on-surface-variant">No line items stored for this outing.</p>
          )}
        </Card>
      ) : null}

      {outing.notes ? (
        <Card>
          <h2 className="m3-title-medium">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap m3-body-medium text-on-surface-variant">{outing.notes}</p>
        </Card>
      ) : null}

    </div>
  )
}
