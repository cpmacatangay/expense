import { db } from '../schema'
import type { Coverage } from '../../types'

export async function listCoverageForOuting(outingId: string): Promise<Coverage[]> {
  return db.coverage.where('outingId').equals(outingId).toArray()
}

export async function listAllCoverage(): Promise<Coverage[]> {
  return db.coverage.toArray()
}
