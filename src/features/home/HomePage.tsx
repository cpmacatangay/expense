import { useLiveQuery } from 'dexie-react-hooks'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/m3'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Money } from '../../components/ui/Money'
import { listAllCoverage } from '../../lib/db/repositories/coverage'
import { listMembers } from '../../lib/db/repositories/members'
import { listFinalOutings } from '../../lib/db/repositories/outings'
import { listSettlements } from '../../lib/db/repositories/settlements'
import { listAllShares } from '../../lib/db/repositories/shares'
import { listStudents } from '../../lib/db/repositories/students'
import { computeFairness } from '../../lib/money/fairness'
import { computeBalances, suggestSettlements } from '../../lib/money/settle-up'
import { useCurrentMemberId } from '../auth/useCurrentMember'

function shortDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

export function HomePage() {
  const currentMemberId = useCurrentMemberId()
  const members = useLiveQuery(() => listMembers(), [], [])
  const students = useLiveQuery(() => listStudents(true), [], [])
  const outings = useLiveQuery(() => listFinalOutings(), [], [])
  const shares = useLiveQuery(() => listAllShares(), [], [])
  const settlements = useLiveQuery(() => listSettlements(), [], [])
  const coverage = useLiveQuery(() => listAllCoverage(), [], [])

  const memberIds = members.map((member) => member.id)
  const currentMember = members.find((member) => member.id === currentMemberId)
  const balances = computeBalances({ outings, shares, settlements, memberIds })
  const myBalance = balances.find((balance) => balance.memberId === currentMemberId)
  const transfers = suggestSettlements(balances)
  const fairness = computeFairness({ outings, coverage, memberIds })
  const recent = outings.slice(0, 4)
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]))

  return (
    <div className="space-y-4">
      <div>
        <p className="m3-label-medium uppercase tracking-[0.16em] text-on-surface-variant">
          {new Date().toLocaleDateString('en-PH', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
          })}
        </p>
        <h1 className="m3-headline-medium mt-1">Hi, {currentMember?.name ?? 'there'}</h1>
      </div>

      <Card variant="primary" className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m3-label-medium uppercase tracking-[0.16em] text-on-primary-container/70">
              {myBalance && myBalance.netCentavos > 0
                ? 'You are owed'
                : myBalance && myBalance.netCentavos < 0
                  ? 'You owe'
                  : 'Your balance'}
            </p>
            <p className="mt-2 font-mono text-4xl tracking-tight text-on-primary-container">
              {myBalance && myBalance.netCentavos !== 0 ? (
                <Money centavos={Math.abs(myBalance.netCentavos)} size="xl" />
              ) : (
                'Settled up'
              )}
            </p>
            <p className="m3-body-small mt-2 text-on-primary-container/70">
              {outings.length} finalized {outings.length === 1 ? 'outing' : 'outings'} ·{' '}
              {students.length} {students.length === 1 ? 'student' : 'students'}
            </p>
          </div>
          <div className="rounded-full bg-on-primary-container/10 p-3">
            <Icon>account_balance</Icon>
          </div>
        </div>

        <Link to="/ledger" className="block">
          <Button fullWidth variant="on-primary-container">
            Settle up
          </Button>
        </Link>
      </Card>

      {transfers.length > 0 ? (
        <Card variant="outlined">
          <div className="flex items-center justify-between">
            <h2 className="m3-title-medium">Who pays whom</h2>
            <Link to="/ledger" className="m3-label-large text-primary">
              Ledger
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {transfers.map((transfer) => (
              <div
                key={`${transfer.fromMemberId}-${transfer.toMemberId}`}
                className="m3-body-medium flex items-center justify-between"
              >
                <span className="text-on-surface-variant">
                  {membersById[transfer.fromMemberId]?.name ?? 'Someone'} →{' '}
                  {membersById[transfer.toMemberId]?.name ?? 'someone'}
                </span>
                <Money centavos={transfer.amountCentavos} className="font-medium" />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card variant="filled">
        <div className="flex items-center justify-between">
          <h2 className="m3-title-medium">Fairness · all time</h2>
          <Link to="/reports" className="m3-label-large text-primary">
            Reports
          </Link>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {fairness.map((tally) => {
            const member = membersById[tally.memberId]
            return (
              <div
                key={tally.memberId}
                className="rounded-m3-sm bg-surface-container p-3 text-center"
              >
                <Avatar name={member?.name ?? '?'} order={member?.order} size="sm" />
                <p className="m3-label-large mt-2 truncate">{member?.name ?? '—'}</p>
                <p className="mt-1 font-mono text-lg leading-none">{tally.studentHeads}</p>
                <p className="m3-label-small mt-1 text-on-surface-variant">student-heads</p>
              </div>
            )
          })}
        </div>
      </Card>

      <div className="flex items-center justify-between pt-1">
        <h2 className="m3-title-medium">Recent outings</h2>
        <Link to="/reports" className="m3-label-large text-primary">
          View all
        </Link>
      </div>

      {recent.length === 0 ? (
        <EmptyState
          icon={<Icon>account_balance</Icon>}
          title="No outings yet"
          description="Add your students, then record the first meal. The split will appear here."
          action={
            <Link to="/outings/new">
              <Button size="sm">
                <span slot="icon">
                  <Icon>add</Icon>
                </span>
                New outing
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          {recent.map((outing) => (
            <Link
              key={outing.id}
              to={`/outings/${outing.id}`}
              className="flex items-center gap-3 rounded-m3-md bg-surface-container-low p-3 transition hover:bg-surface-container"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant">
                <Icon>group</Icon>
              </span>
              <span className="min-w-0 flex-1">
                <span className="m3-title-small block truncate">{outing.place || 'Meal'}</span>
                <span className="m3-body-small mt-0.5 block text-on-surface-variant">
                  {shortDate(outing.date)} · paid by {membersById[outing.payerId]?.name ?? '—'}
                </span>
              </span>
              <span className="text-right">
                <Money centavos={outing.totalCentavos} className="m3-title-small block" />
                <Icon>arrow_forward</Icon>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
