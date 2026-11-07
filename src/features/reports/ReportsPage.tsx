import { useLiveQuery } from 'dexie-react-hooks'
import { format, startOfMonth, subDays } from 'date-fns'
import { useMemo, useState } from 'react'
import { FilterChip, Icon } from '../../components/m3'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { EmptyState } from '../../components/ui/EmptyState'
import { Money } from '../../components/ui/Money'
import { PageHeader } from '../../components/ui/PageHeader'
import { listAllCoverage } from '../../lib/db/repositories/coverage'
import { listMembers } from '../../lib/db/repositories/members'
import { listFinalOutings } from '../../lib/db/repositories/outings'
import { listAllShares } from '../../lib/db/repositories/shares'
import { listStudents } from '../../lib/db/repositories/students'
import { formatCentavos } from '../../lib/money/centavos'
import { computeFairness } from '../../lib/money/fairness'
import { downloadText } from '../../lib/platform/share'

type RangeKey = 'this-month' | 'last-30' | 'all'

const RANGE_LABELS: Record<RangeKey, string> = {
  'this-month': 'This month',
  'last-30': 'Last 30 days',
  all: 'All time'
}

function getRange(key: RangeKey): { start?: string; end?: string } {
  const now = new Date()
  if (key === 'all') return {}
  if (key === 'this-month') {
    return {
      start: format(startOfMonth(now), 'yyyy-MM-dd'),
      end: format(now, 'yyyy-MM-dd')
    }
  }
  return {
    start: format(subDays(now, 29), 'yyyy-MM-dd'),
    end: format(now, 'yyyy-MM-dd')
  }
}

function csvEscape(value: string | number): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function ReportsPage() {
  const [rangeKey, setRangeKey] = useState<RangeKey>('this-month')
  const members = useLiveQuery(() => listMembers(), []) ?? []
  const students = useLiveQuery(() => listStudents(), []) ?? []
  const outings = useLiveQuery(() => listFinalOutings(), []) ?? []
  const shares = useLiveQuery(() => listAllShares(), []) ?? []
  const coverage = useLiveQuery(() => listAllCoverage(), []) ?? []

  const range = getRange(rangeKey)
  const memberIds = members.map((member) => member.id)
  const membersById = Object.fromEntries(members.map((member) => [member.id, member]))
  const studentsById = Object.fromEntries(students.map((student) => [student.id, student]))

  const filteredOutings = useMemo(
    () =>
      outings.filter((outing) => {
        if (!range.start || !range.end) return true
        return outing.date >= range.start && outing.date <= range.end
      }),
    [outings, range.end, range.start]
  )

  const outingIds = new Set(filteredOutings.map((outing) => outing.id))
  const filteredCoverage = coverage.filter((row) => outingIds.has(row.outingId))
  const filteredShares = shares.filter((share) => outingIds.has(share.outingId))
  const fairness = computeFairness({
    outings: filteredOutings,
    coverage: filteredCoverage,
    memberIds
  })

  const totalSpend = filteredOutings.reduce((sum, outing) => sum + outing.totalCentavos, 0)

  const studentStats = students
    .map((student) => {
      const rows = filteredCoverage.filter((row) => row.studentId === student.id)
      const outingMap = new Map(filteredOutings.map((outing) => [outing.id, outing]))
      const last = rows
        .map((row) => ({ row, outing: outingMap.get(row.outingId) }))
        .filter((item) => item.outing)
        .sort((a, b) => (a.outing!.date < b.outing!.date ? 1 : -1))[0]
      const amount = rows.reduce(
        (sum, row) => sum + (outingMap.get(row.outingId)?.perHeadCentavos ?? 0),
        0
      )
      return {
        student,
        count: rows.length,
        amount,
        lastAdult: last ? membersById[last.row.memberId]?.name : undefined,
        lastDate: last?.outing?.date
      }
    })
    .filter((stat) => stat.count > 0)
    .sort((a, b) => b.count - a.count)

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      range: rangeKey,
      members,
      students,
      outings: filteredOutings,
      coverage: filteredCoverage,
      shares: filteredShares
    }
    downloadText(
      JSON.stringify(payload, null, 2),
      `salo-export-${format(new Date(), 'yyyyMMdd-HHmm')}.json`,
      'application/json'
    )
  }

  const exportCsv = () => {
    const header = ['date', 'place', 'total', 'headcount', 'per_head', 'payer', 'coverage']
    const rows = filteredOutings.map((outing) => {
      const covered = filteredCoverage
        .filter((row) => row.outingId === outing.id)
        .map(
          (row) =>
            `${studentsById[row.studentId]?.name ?? 'Student'} (${membersById[row.memberId]?.name ?? '—'})`
        )
        .join('; ')
      return [
        outing.date,
        outing.place ?? '',
        formatCentavos(outing.totalCentavos),
        outing.headcount,
        formatCentavos(outing.perHeadCentavos),
        membersById[outing.payerId]?.name ?? '',
        covered
      ].map(csvEscape)
    })
    const csv = [header.join(','), ...rows.map((row) => row.join(','))].join('\n')
    downloadText(csv, `salo-outings-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, 'text/csv')
  }

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Totals, fairness, and per-student history."
        action={
          <Button variant="ghost" size="sm" onClick={exportJson} disabled={filteredOutings.length === 0}>
            <span slot="icon">
              <Icon>data_object</Icon>
            </span>
            JSON
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(RANGE_LABELS) as RangeKey[]).map((key) => (
          <FilterChip
            key={key}
            label={RANGE_LABELS[key]}
            selected={rangeKey === key}
            onClick={() => setRangeKey(key)}
          />
        ))}
      </div>

      {filteredOutings.length === 0 ? (
        <EmptyState
          icon={<Icon>bar_chart</Icon>}
          title="Nothing to report yet"
          description="Finalize an outing to see spend, coverage, and fairness."
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start justify-between">
              <div>
                <p className="m3-label-medium uppercase tracking-[0.14em] text-on-surface-variant">
                  Total spend
                </p>
                <Money centavos={totalSpend} size="lg" className="mt-1 block" />
                <p className="mt-1 m3-body-small text-on-surface-variant">
                  {filteredOutings.length} {filteredOutings.length === 1 ? 'outing' : 'outings'} ·{' '}
                  {filteredCoverage.length} student-heads covered
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={exportCsv}>
                <span slot="icon">
                  <Icon>download</Icon>
                </span>
                CSV
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="m3-title-medium">Fairness</h2>
            <div className="mt-3 space-y-3">
              {fairness.map((tally) => {
                const member = membersById[tally.memberId]
                return (
                  <div key={tally.memberId} className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <Avatar name={member?.name ?? '?'} order={member?.order} size="sm" />
                      <span>
                        <span className="block m3-title-small">{member?.name ?? '—'}</span>
                        <span className="block m3-body-small text-on-surface-variant">
                          {tally.studentHeads} student-heads
                        </span>
                      </span>
                    </span>
                    <Money centavos={tally.amountCoveredCentavos} className="m3-title-small" />
                  </div>
                )
              })}
            </div>
          </Card>

          <Card>
            <h2 className="m3-title-medium">Per student</h2>
            {studentStats.length === 0 ? (
              <p className="mt-2 m3-body-medium text-on-surface-variant">No students were covered in this range.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {studentStats.map((stat) => (
                  <div
                    key={stat.student.id}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-surface-container/60 px-3 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate m3-title-small">
                        {stat.student.name}
                      </span>
                      <span className="block m3-body-small text-on-surface-variant">
                        {stat.count} {stat.count === 1 ? 'meal' : 'meals'}
                        {stat.lastAdult ? ` · last by ${stat.lastAdult}` : ''}
                      </span>
                    </span>
                    <Money centavos={stat.amount} className="m3-title-small" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
