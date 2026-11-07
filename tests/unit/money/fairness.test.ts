import { describe, expect, it } from 'vitest'
import { autoAssign, computeFairness } from '../../../src/lib/money/fairness'
import type { Coverage, Outing } from '../../../src/lib/types'

const members = ['cp', 'mai', 'kent', 'llanmer'] as const

const outings: Outing[] = [
  {
    id: 'o1',
    date: '2026-11-01',
    payerId: 'cp',
    status: 'final',
    totalCentavos: 300_000,
    headcount: 6,
    perHeadCentavos: 50_000,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z'
  },
  {
    id: 'o2',
    date: '2026-11-02',
    payerId: 'mai',
    status: 'final',
    totalCentavos: 300_000,
    headcount: 6,
    perHeadCentavos: 50_000,
    createdAt: '2026-11-02T00:00:00.000Z',
    updatedAt: '2026-11-02T00:00:00.000Z'
  }
]

const coverage: Coverage[] = [
  { id: 'c1', outingId: 'o1', studentId: 'a', memberId: 'cp' },
  { id: 'c2', outingId: 'o1', studentId: 'b', memberId: 'cp' },
  { id: 'c3', outingId: 'o1', studentId: 'c', memberId: 'mai' },
  { id: 'c4', outingId: 'o2', studentId: 'a', memberId: 'mai' }
]

describe('fairness', () => {
  it('counts student-heads and covered amounts by adult', () => {
    const tallies = computeFairness({ outings, coverage, memberIds: members })

    expect(tallies.find((tally) => tally.memberId === 'cp')).toEqual({
      memberId: 'cp',
      studentHeads: 2,
      amountCoveredCentavos: 100_000
    })
    expect(tallies.find((tally) => tally.memberId === 'mai')).toEqual({
      memberId: 'mai',
      studentHeads: 2,
      amountCoveredCentavos: 100_000
    })
    expect(tallies.find((tally) => tally.memberId === 'kent')).toEqual({
      memberId: 'kent',
      studentHeads: 0,
      amountCoveredCentavos: 0
    })
    expect(tallies.find((tally) => tally.memberId === 'llanmer')).toEqual({
      memberId: 'llanmer',
      studentHeads: 0,
      amountCoveredCentavos: 0
    })
  })

  it('balances a fresh assignment across the four adults', () => {
    const assignment = autoAssign(['a', 'b', 'c', 'd'], members, [
      { memberId: 'cp', studentHeads: 0, amountCoveredCentavos: 0 },
      { memberId: 'mai', studentHeads: 0, amountCoveredCentavos: 0 },
      { memberId: 'kent', studentHeads: 0, amountCoveredCentavos: 0 },
      { memberId: 'llanmer', studentHeads: 0, amountCoveredCentavos: 0 }
    ])

    expect(Object.keys(assignment)).toHaveLength(4)
    expect(new Set(Object.values(assignment)).size).toBe(4)
  })

  it('favors the adult with the fewest student-heads', () => {
    const assignment = autoAssign(['a', 'b', 'c'], members, [
      { memberId: 'cp', studentHeads: 4, amountCoveredCentavos: 200_000 },
      { memberId: 'mai', studentHeads: 3, amountCoveredCentavos: 150_000 },
      { memberId: 'kent', studentHeads: 0, amountCoveredCentavos: 0 },
      { memberId: 'llanmer', studentHeads: 2, amountCoveredCentavos: 100_000 }
    ])

    expect(assignment.a).toBe('kent')
  })
})
