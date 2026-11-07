import { Capacitor } from '@capacitor/core'
import { MlKitOcr } from './mlkit'
import { TesseractOcr } from './tesseract'
import type { ReceiptOcr } from './types'

export function createOcrAdapter(): ReceiptOcr {
  return Capacitor.isNativePlatform() ? new MlKitOcr() : new TesseractOcr()
}

export { parseReceipt, parseReceiptText } from './parser'
export type {
  ImageSource,
  OcrLine,
  OcrResult,
  ParsedReceipt,
  ParsedReceiptItem,
  ReceiptOcr
} from './types'
