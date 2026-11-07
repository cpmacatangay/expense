import type { OcrEngine } from '../types'

export interface OcrBBox {
  x: number
  y: number
  width: number
  height: number
}

export interface OcrLine {
  text: string
  bbox: OcrBBox
  confidence?: number
}

export interface OcrResult {
  engine: OcrEngine
  lines: OcrLine[]
  rawText: string
  imageWidth: number
  imageHeight: number
  durationMs: number
  warnings: string[]
}

export interface ImageSource {
  blob: Blob
  dataUrl?: string
  path?: string
  width: number
  height: number
  mime: string
}

export interface ReceiptOcr {
  readonly engine: OcrEngine
  recognize(image: ImageSource): Promise<OcrResult>
}

export interface ParsedReceiptItem {
  description: string
  quantity?: number
  unitPriceCentavos?: number
  lineTotalCentavos: number
  confidence: number
}

export interface ParsedReceipt {
  merchant?: string
  receiptDate?: string
  subtotalCentavos?: number
  taxCentavos?: number
  serviceCentavos?: number
  discountCentavos?: number
  tipCentavos?: number
  totalCentavos?: number
  items: ParsedReceiptItem[]
  warnings: string[]
  confidence: number
  parserVersion: string
  rawText: string
}

export class OcrError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'OcrError'
  }
}
