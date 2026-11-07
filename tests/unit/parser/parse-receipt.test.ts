import { describe, expect, it } from 'vitest'
import { parseReceiptText } from '../../../src/lib/ocr/parser'

describe('parseReceiptText', () => {
  it('extracts merchant, date, total, tax, service, and line items', () => {
    const parsed = parseReceiptText(`
MANAM GREENBELT
123 Some Street
01/15/2026
Chicken 500.00
Rice 100.00
Subtotal 600.00
VAT 72.00
Service Charge 60.00
TOTAL 732.00
`)

    expect(parsed.merchant).toBe('MANAM GREENBELT')
    expect(parsed.receiptDate).toBe('2026-01-15')
    expect(parsed.subtotalCentavos).toBe(60_000)
    expect(parsed.taxCentavos).toBe(7_200)
    expect(parsed.serviceCentavos).toBe(6_000)
    expect(parsed.totalCentavos).toBe(73_200)
    expect(parsed.items).toHaveLength(2)
    expect(parsed.warnings).toHaveLength(0)
    expect(parsed.confidence).toBeGreaterThan(0.8)
  })

  it('handles peso signs and comma separators', () => {
    const parsed = parseReceiptText(`
TEST CAFE
01/16/2026
Coffee ₱1,250.50
TOTAL DUE ₱1,250.50
`)

    expect(parsed.totalCentavos).toBe(125_050)
    expect(parsed.items[0]?.lineTotalCentavos).toBe(125_050)
  })

  it('falls back to the largest amount and warns when no total keyword exists', () => {
    const parsed = parseReceiptText(`
RANDOM RECEIPT
01/17/2026
Something 123.45
`)

    expect(parsed.totalCentavos).toBe(12_345)
    expect(parsed.warnings.join(' ')).toContain('No total keyword')
  })

  it('returns no total for empty text', () => {
    const parsed = parseReceiptText('')
    expect(parsed.totalCentavos).toBeUndefined()
    expect(parsed.warnings.join(' ')).toContain('No total')
  })
})
