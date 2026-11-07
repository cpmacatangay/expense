import Dexie, { type Table } from 'dexie'
import type {
  AppMeta,
  Coverage,
  Member,
  OutboxRow,
  Outing,
  OutingStudent,
  Receipt,
  ReceiptItem,
  Settlement,
  Share,
  Student
} from '../types'

export class SaloDB extends Dexie {
  members!: Table<Member, string>
  students!: Table<Student, string>
  outings!: Table<Outing, string>
  receipts!: Table<Receipt, string>
  receiptItems!: Table<ReceiptItem, string>
  outingStudents!: Table<OutingStudent, [string, string]>
  coverage!: Table<Coverage, string>
  shares!: Table<Share, string>
  settlements!: Table<Settlement, string>
  outbox!: Table<OutboxRow, string>
  meta!: Table<AppMeta, string>

  constructor() {
    super('salo-db')
    this.version(1).stores({
      members: 'id, name, order',
      students: 'id, name, active, updatedAt',
      outings: 'id, date, status, payerId, updatedAt',
      receipts: 'id, outingId',
      receiptItems: 'id, receiptId, sortOrder',
      outingStudents: '[outingId+studentId], outingId, studentId',
      coverage: 'id, outingId, studentId, memberId, &[outingId+studentId]',
      shares: 'id, outingId, memberId, &[outingId+memberId]',
      settlements: 'id, date, fromMemberId, toMemberId, createdAt',
      outbox: 'id, entity, entityId, createdAt',
      meta: 'key'
    })
  }
}

export const db = new SaloDB()

export const DEMO_MEMBER_IDS = {
  cp: '11111111-1111-4111-8111-111111111111',
  mai: '22222222-2222-4222-8222-222222222222',
  kent: '33333333-3333-4333-8333-333333333333',
  llanmer: '44444444-4444-4444-8444-444444444444'
} as const

export const DEMO_MEMBERS: Member[] = [
  { id: DEMO_MEMBER_IDS.cp, name: 'CP', email: 'cp@example.com', order: 1 },
  { id: DEMO_MEMBER_IDS.mai, name: 'Mai', email: 'mai@example.com', order: 2 },
  { id: DEMO_MEMBER_IDS.kent, name: 'Kent', email: 'kent@example.com', order: 3 },
  { id: DEMO_MEMBER_IDS.llanmer, name: 'Llanmer', email: 'llanmer@example.com', order: 4 }
]

export async function ensureSeed(): Promise<void> {
  await db.transaction('rw', db.members, db.meta, async () => {
    for (const member of DEMO_MEMBERS) {
      const existing = await db.members.get(member.id)
      if (!existing) {
        await db.members.add(member)
      } else if (
        member.id === DEMO_MEMBER_IDS.kent &&
        (existing.name === 'Llanmer' || existing.email === 'llanmer@example.com')
      ) {
        // Repair the earlier three-adult seed where Kent was renamed to Llanmer.
        await db.members.put({ ...existing, name: 'Kent', email: 'kent@example.com', order: 3 })
      }
    }
    const group = await db.meta.get('groupName')
    if (!group) await db.meta.put({ key: 'groupName', value: 'Salo' })
    const currency = await db.meta.get('currency')
    if (!currency) await db.meta.put({ key: 'currency', value: 'PHP' })
  })
}

export async function resetLocalData(): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.members,
      db.students,
      db.outings,
      db.receipts,
      db.receiptItems,
      db.outingStudents,
      db.coverage,
      db.shares,
      db.settlements,
      db.outbox,
      db.meta
    ],
    async () => {
      await Promise.all([
        db.students.clear(),
        db.outings.clear(),
        db.receipts.clear(),
        db.receiptItems.clear(),
        db.outingStudents.clear(),
        db.coverage.clear(),
        db.shares.clear(),
        db.settlements.clear(),
        db.outbox.clear()
      ])
    }
  )
  await ensureSeed()
}
