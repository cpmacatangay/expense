export type OcrEngine = 'mlkit' | 'tesseract' | 'manual'

export interface Member {
  id: string
  name: string
  email: string
  order: number
}

export interface Student {
  id: string
  name: string
  notes?: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface ReceiptItem {
  id: string
  receiptId: string
  description: string
  quantity?: number
  unitPriceCentavos?: number
  lineTotalCentavos: number
  confidence?: number
  sortOrder: number
}

export interface Receipt {
  id: string
  outingId: string
  merchant?: string
  receiptDate?: string
  totalCentavos: number
  rawText?: string
  ocrEngine: OcrEngine
  parserVersion?: string
  imageDataUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Outing {
  id: string
  date: string
  place?: string
  notes?: string
  payerId: string
  status: 'draft' | 'final'
  totalCentavos: number
  headcount: number
  perHeadCentavos: number
  createdAt: string
  updatedAt: string
  finalizedAt?: string
  deletedAt?: string
}

export interface OutingStudent {
  outingId: string
  studentId: string
  present: boolean
}

export interface Coverage {
  id: string
  outingId: string
  studentId: string
  memberId: string
}

export interface Share {
  id: string
  outingId: string
  memberId: string
  ownHead: number
  coveredStudents: number
  amountCentavos: number
  isPayer: boolean
}

export interface Settlement {
  id: string
  fromMemberId: string
  toMemberId: string
  amountCentavos: number
  date: string
  note?: string
  voidedAt?: string
  createdAt: string
}

export interface Balance {
  memberId: string
  paidCentavos: number
  owedCentavos: number
  settledOutCentavos: number
  settledInCentavos: number
  netCentavos: number
}

export interface Transfer {
  fromMemberId: string
  toMemberId: string
  amountCentavos: number
}

export interface FairnessTally {
  memberId: string
  studentHeads: number
  amountCoveredCentavos: number
}

export interface OutboxRow {
  id: string
  entity: string
  entityId: string
  action: 'upsert' | 'delete'
  payload: string
  createdAt: string
  attempts: number
  lastError?: string
}

export interface AppMeta {
  key: string
  value: string
}

export interface OutingBundle {
  outing: Outing
  receipt?: Receipt
  items: ReceiptItem[]
  coverage: Coverage[]
  shares: Share[]
  attendance: OutingStudent[]
  students: Student[]
  members: Member[]
}
