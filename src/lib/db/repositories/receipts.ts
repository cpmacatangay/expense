import { db } from '../schema'
import type { Receipt, ReceiptItem } from '../../types'

export async function getReceiptForOuting(outingId: string): Promise<Receipt | undefined> {
  return db.receipts.where('outingId').equals(outingId).first()
}

export async function getReceiptItems(receiptId: string): Promise<ReceiptItem[]> {
  return db.receiptItems.where('receiptId').equals(receiptId).sortBy('sortOrder')
}

export async function listAllReceipts(): Promise<Receipt[]> {
  return db.receipts.toArray()
}
