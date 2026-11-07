import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Icon } from '../../components/m3'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { listMembers } from '../../lib/db/repositories/members'
import {
  isDemoMode,
  setCurrentMemberId,
  signInWithGoogle
} from '../../lib/platform/auth'

export function SignInPage() {
  const members = useLiveQuery(() => listMembers(), [], [])
  const [error, setError] = useState<string | null>(null)

  const handleGoogle = async () => {
    setError(null)
    try {
      await signInWithGoogle()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Google sign-in failed')
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-on-primary">
            S
          </div>
          <h1 className="m3-display-small mt-4">Salo</h1>
          <p className="m3-body-large mt-2 text-on-surface-variant">
            A private per-head ledger for four adults covering meals for students.
          </p>
        </div>

        <Card className="space-y-4">
          {isDemoMode() ? (
            <div className="flex items-start gap-2 rounded-m3-sm bg-surface-container-high p-4 m3-body-small text-on-surface-variant">
              <Icon>cloud_off</Icon>
              <p>
                Local demo mode. Supabase and Google sign-in are not configured yet, so choose who
                is using this device. The ledger stays on this device.
              </p>
            </div>
          ) : (
            <Button fullWidth onClick={handleGoogle}>
              <span slot="icon">
                <Icon>public</Icon>
              </span>
              Continue with Google
            </Button>
          )}

          <div>
            <p className="mb-2 m3-label-medium uppercase tracking-[0.16em] text-on-surface-variant">
              Continue as
            </p>
            <div className="space-y-2">
              {members.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => setCurrentMemberId(member.id)}
                  className="flex w-full items-center gap-3 rounded-m3-md border border-outline-variant bg-surface-container-lowest px-4 py-3 text-left transition hover:border-primary/40 hover:bg-primary-container/40"
                >
                  <Avatar name={member.name} order={member.order} />
                  <span className="min-w-0 flex-1">
                    <span className="block m3-title-small">{member.name}</span>
                    <span className="block truncate m3-body-small text-on-surface-variant">{member.email}</span>
                  </span>
                  <span className="m3-label-large text-primary">Open</span>
                </button>
              ))}
            </div>
          </div>

          {error ? <p className="m3-body-medium text-error">{error}</p> : null}

          <p className="m3-body-small text-center leading-relaxed text-on-surface-variant">
            Receipts are read on-device. Student records are names only.
          </p>
        </Card>
      </div>
    </div>
  )
}
