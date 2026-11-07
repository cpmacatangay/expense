import { db } from '../schema'
import type { Settlement } from '../../types'

export async function listSettlements(): Promise<Settlement[]> {
  return db.settlements.orderBy('date').reverse().toArray()
}

export async function recordSettlement(input: {
  fromMemberId: string
  toMemberId: string
  amountCentavos: number
  date: string
  note?: string
}): Promise<Settlement> {
  if (input.fromMemberId === input.toMemberId) {
    throw new Error('Payer and receiver must be different')
  }
  if (!Number.isInteger(input.amountCentavos) || input.amountCentavos <= 0) {
    throw new Error('Amount must be positive')
  }

  const [from, to] = await Promise.all([
    db.members.get(input.fromMemberId),
    db.members.get(input.toMemberId)
  ])
  if (!from || !to) throw new Error('Member not found')

  const settlement: Settlement = {
    id: crypto.randomUUID(),
    fromMemberId: input.fromMemberId,
    toMemberId: input.toMemberId,
    amountCentavos: input.amountCentavos,
    date: input.date,
    note: input.note?.trim() || undefined,
    createdAt: new Date().toISOString()
  }

  await db.settlements.add(settlement)
  return settlement
}

export async function voidSettlement(id: string): Promise<void> {
  const settlement = await db.settlements.get(id)
  if (!settlement) return
  await db.settlements.put({
    ...settlement,
    voidedAt: new Date().toISOString()
  })
}
