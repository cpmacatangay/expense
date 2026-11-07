import type { Balance, Outing, Settlement, Share, Transfer } from '../types'

export interface BalanceInput {
  outings: Outing[]
  shares: Share[]
  settlements: Settlement[]
  memberIds: readonly string[]
}

export function computeBalances(input: BalanceInput): Balance[] {
  const balances = new Map<string, Balance>(
    input.memberIds.map((memberId) => [
      memberId,
      {
        memberId,
        paidCentavos: 0,
        owedCentavos: 0,
        settledOutCentavos: 0,
        settledInCentavos: 0,
        netCentavos: 0
      }
    ])
  )

  const finalOutings = new Map(
    input.outings
      .filter((outing) => outing.status === 'final' && !outing.deletedAt)
      .map((outing) => [outing.id, outing])
  )

  for (const outing of finalOutings.values()) {
    const payer = balances.get(outing.payerId)
    if (payer) payer.paidCentavos += outing.totalCentavos
  }

  for (const share of input.shares) {
    if (!finalOutings.has(share.outingId)) continue
    const balance = balances.get(share.memberId)
    if (balance) balance.owedCentavos += share.amountCentavos
  }

  for (const settlement of input.settlements) {
    if (settlement.voidedAt) continue
    const from = balances.get(settlement.fromMemberId)
    const to = balances.get(settlement.toMemberId)
    if (from) from.settledOutCentavos += settlement.amountCentavos
    if (to) to.settledInCentavos += settlement.amountCentavos
  }

  return input.memberIds.map((memberId) => {
    const balance = balances.get(memberId)!
    balance.netCentavos =
      balance.paidCentavos -
      balance.owedCentavos +
      balance.settledOutCentavos -
      balance.settledInCentavos
    return balance
  })
}

export function suggestSettlements(balances: Balance[]): Transfer[] {
  const debtors = balances
    .filter((balance) => balance.netCentavos < 0)
    .map((balance) => ({ memberId: balance.memberId, remaining: -balance.netCentavos }))
    .sort((a, b) => b.remaining - a.remaining)

  const creditors = balances
    .filter((balance) => balance.netCentavos > 0)
    .map((balance) => ({ memberId: balance.memberId, remaining: balance.netCentavos }))
    .sort((a, b) => b.remaining - a.remaining)

  const transfers: Transfer[] = []
  let debtorIndex = 0
  let creditorIndex = 0

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex]
    const creditor = creditors[creditorIndex]
    const amount = Math.min(debtor.remaining, creditor.remaining)

    if (amount > 0) {
      transfers.push({
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        amountCentavos: amount
      })
    }

    debtor.remaining -= amount
    creditor.remaining -= amount
    if (debtor.remaining === 0) debtorIndex += 1
    if (creditor.remaining === 0) creditorIndex += 1
  }

  return transfers
}
