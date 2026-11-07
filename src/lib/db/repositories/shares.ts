import { db } from '../schema'
import type { Share } from '../../types'

export async function listSharesForOuting(outingId: string): Promise<Share[]> {
  return db.shares.where('outingId').equals(outingId).toArray()
}

export async function listAllShares(): Promise<Share[]> {
  return db.shares.toArray()
}
