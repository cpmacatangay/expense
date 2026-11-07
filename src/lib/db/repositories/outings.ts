import { db } from '../schema'
import { splitOuting, type SplitResult } from '../../money/split'
import type {
  Coverage,
  OcrEngine,
  Outing,
  OutingBundle,
  Receipt,
  ReceiptItem,
  Share
} from '../../types'

export interface ReceiptItemInput {
  description: string
  quantity?: number
  unitPriceCentavos?: number
  lineTotalCentavos: number
  confidence?: number
  sortOrder?: number
}

export interface CreateOutingInput {
  date: string
  place?: string
  notes?: string
  payerId: string
  totalCentavos: number
  presentStudentIds: string[]
  coverageByStudent: Record<string, string>
  receipt: {
    merchant?: string
    receiptDate?: string
    items: ReceiptItemInput[]
    rawText?: string
    ocrEngine: OcrEngine
    parserVersion?: string
    imageDataUrl?: string
  }
}

export async function listOutings(): Promise<Outing[]> {
  const outings = await db.outings.orderBy('date').reverse().toArray()
  return outings.filter((outing) => !outing.deletedAt)
}

export async function listFinalOutings(): Promise<Outing[]> {
  return (await listOutings()).filter((outing) => outing.status === 'final')
}

export async function getOuting(id: string): Promise<Outing | undefined> {
  return db.outings.get(id)
}

export async function createFinalOuting(input: CreateOutingInput): Promise<{
  outing: Outing
  split: SplitResult
}> {
  const payer = await db.members.get(input.payerId)
  if (!payer) throw new Error('Payer not found')

  const members = await db.members.orderBy('order').toArray()
  const memberIds = members.map((member) => member.id)
  const split = splitOuting({
    totalCentavos: input.totalCentavos,
    memberIds,
    presentStudentIds: input.presentStudentIds,
    coverageByStudent: input.coverageByStudent
  })

  const now = new Date().toISOString()
  const outingId = crypto.randomUUID()
  const receiptId = crypto.randomUUID()

  const outing: Outing = {
    id: outingId,
    date: input.date,
    place: input.place?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    payerId: input.payerId,
    status: 'final',
    totalCentavos: input.totalCentavos,
    headcount: split.headcount,
    perHeadCentavos: split.perHeadCentavos,
    createdAt: now,
    updatedAt: now,
    finalizedAt: now
  }

  const receipt: Receipt = {
    id: receiptId,
    outingId,
    merchant: input.receipt.merchant?.trim() || undefined,
    receiptDate: input.receipt.receiptDate || undefined,
    totalCentavos: input.totalCentavos,
    rawText: input.receipt.rawText,
    ocrEngine: input.receipt.ocrEngine,
    parserVersion: input.receipt.parserVersion,
    imageDataUrl: input.receipt.imageDataUrl,
    createdAt: now,
    updatedAt: now
  }

  const items: ReceiptItem[] = input.receipt.items.map((item, index) => ({
    id: crypto.randomUUID(),
    receiptId,
    description: item.description,
    quantity: item.quantity,
    unitPriceCentavos: item.unitPriceCentavos,
    lineTotalCentavos: item.lineTotalCentavos,
    confidence: item.confidence,
    sortOrder: item.sortOrder ?? index
  }))

  const attendance = input.presentStudentIds.map((studentId) => ({
    outingId,
    studentId,
    present: true
  }))

  const coverage: Coverage[] = input.presentStudentIds.map((studentId) => ({
    id: crypto.randomUUID(),
    outingId,
    studentId,
    memberId: input.coverageByStudent[studentId]
  }))

  const shares: Share[] = split.shares.map((share) => ({
    id: crypto.randomUUID(),
    outingId,
    memberId: share.memberId,
    ownHead: share.ownHead,
    coveredStudents: share.coveredStudents,
    amountCentavos: share.amountCentavos,
    isPayer: share.memberId === input.payerId
  }))

  await db.transaction(
    'rw',
    [db.outings, db.receipts, db.receiptItems, db.outingStudents, db.coverage, db.shares],
    async () => {
      await db.outings.add(outing)
      await db.receipts.add(receipt)
      if (items.length > 0) await db.receiptItems.bulkAdd(items)
      if (attendance.length > 0) await db.outingStudents.bulkAdd(attendance)
      if (coverage.length > 0) await db.coverage.bulkAdd(coverage)
      await db.shares.bulkAdd(shares)
    }
  )

  return { outing, split }
}

export async function softDeleteOuting(id: string): Promise<void> {
  const outing = await db.outings.get(id)
  if (!outing) return
  await db.outings.put({
    ...outing,
    deletedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })
}

export async function getOutingBundle(id: string): Promise<OutingBundle | null> {
  const outing = await db.outings.get(id)
  if (!outing) return null

  const [receipt, coverage, shares, attendance, members] = await Promise.all([
    db.receipts.where('outingId').equals(id).first(),
    db.coverage.where('outingId').equals(id).toArray(),
    db.shares.where('outingId').equals(id).toArray(),
    db.outingStudents.where('outingId').equals(id).toArray(),
    db.members.orderBy('order').toArray()
  ])

  const items = receipt
    ? await db.receiptItems.where('receiptId').equals(receipt.id).sortBy('sortOrder')
    : []
  const studentRows = await db.students.bulkGet(attendance.map((row) => row.studentId))

  return {
    outing,
    receipt,
    items,
    coverage,
    shares,
    attendance,
    students: studentRows.filter((student) => Boolean(student)) as OutingBundle['students'],
    members
  }
}
