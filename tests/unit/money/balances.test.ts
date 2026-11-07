import { describe, expect, it } from 'vitest'
import { computeBalances, suggestSettlements } from '../../../src/lib/money/settle-up'
import type { Outing, Settlement, Share } from '../../../src/lib/types'

const members = ['cp', 'mai', 'kent', 'llanmer'] as const

const outing: Outing = {
  id: 'outing-1',
  date: '2026-11-07',
  payerId: 'cp',
  status: 'final',
  totalCentavos: 300_000,
  headcount: 6,
  perHeadCentavos: 50_000,
  createdAt: '2026-11-07T00:00:00.000Z',
  updatedAt: '2026-11-07T00:00:00.000Z'
}

const shares: Share[] = [
  {
    id: 's-cp',
    outingId: outing.id,
    memberId: 'cp',
    ownHead: 1,
    coveredStudents: 2,
    amountCentavos: 150_000,
    isPayer: true
  },
  {
    id: 's-mai',
    outingId: outing.id,
    memberId: 'mai',
    ownHead: 1,
    coveredStudents: 0,
    amountCentavos: 50_000,
    isPayer: false
  },
  {
    id: 's-kent',
    outingId: outing.id,
    memberId: 'kent',
    ownHead: 1,
    coveredStudents: 0,
    amountCentavos: 50_000,
    isPayer: false
  },
  {
    id: 's-llanmer',
    outingId: outing.id,
    memberId: 'llanmer',
    ownHead: 1,
    coveredStudents: 0,
    amountCentavos: 50_000,
    isPayer: false
  }
]

describe('balances and settlements', () => {
  it('nets a paid outing', () => {
    const balances = computeBalances({
      outings: [outing],
      shares,
      settlements: [],
      memberIds: members
    })

    expect(balances.find((balance) => balance.memberId === 'cp')?.netCentavos).toBe(150_000)
    expect(balances.find((balance) => balance.memberId === 'mai')?.netCentavos).toBe(-50_000)
    expect(balances.find((balance) => balance.memberId === 'kent')?.netCentavos).toBe(-50_000)
    expect(balances.find((balance) => balance.memberId === 'llanmer')?.netCentavos).toBe(-50_000)

    expect(suggestSettlements(balances)).toEqual([
      { fromMemberId: 'mai', toMemberId: 'cp', amountCentavos: 50_000 },
      { fromMemberId: 'kent', toMemberId: 'cp', amountCentavos: 50_000 },
      { fromMemberId: 'llanmer', toMemberId: 'cp', amountCentavos: 50_000 }
    ])
  })

  it('applies a partial payment', () => {
    const settlement: Settlement = {
      id: 'payment-1',
      fromMemberId: 'mai',
      toMemberId: 'cp',
      amountCentavos: 20_000,
      date: '2026-11-07',
      createdAt: '2026-11-07T00:00:00.000Z'
    }

    const balances = computeBalances({
      outings: [outing],
      shares,
      settlements: [settlement],
      memberIds: members
    })

    expect(balances.find((balance) => balance.memberId === 'cp')?.netCentavos).toBe(130_000)
    expect(balances.find((balance) => balance.memberId === 'mai')?.netCentavos).toBe(-30_000)
  })

  it('ignores voided settlements', () => {
    const settlement: Settlement = {
      id: 'payment-1',
      fromMemberId: 'mai',
      toMemberId: 'cp',
      amountCentavos: 20_000,
      date: '2026-11-07',
      voidedAt: '2026-11-08T00:00:00.000Z',
      createdAt: '2026-11-07T00:00:00.000Z'
    }

    const balances = computeBalances({
      outings: [outing],
      shares,
      settlements: [settlement],
      memberIds: members
    })

    expect(balances.find((balance) => balance.memberId === 'cp')?.netCentavos).toBe(150_000)
    expect(balances.find((balance) => balance.memberId === 'mai')?.netCentavos).toBe(-50_000)
  })
})
