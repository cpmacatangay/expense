import { parsePesoToCentavos } from '../money/centavos'
import type { OcrResult } from './types'
import type { ParsedReceipt, ParsedReceiptItem } from './types'

const PARSER_VERSION = '1.0.0'

const TOTAL_KEYWORDS =
  /\b(grand\s+total|total\s+due|total\s+amount|amount\s+due|balance\s+due|amount\s+payable|total)\b/i
const EXCLUDED =
  /\b(sub\s*total|subtotal|vat|tax|service|discount|change|cash|tender|received|less)\b/i
const MONEY_PATTERN =
  /(?:₱|PHP|P)?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|-?\d+(?:\.\d{1,2})?)/gi
const ITEM_PATTERN =
  /^(.+?)\s+(?:₱|PHP|P)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+(?:\.\d{2})?)\s*$/i
const DATE_PATTERN =
  /(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i

function amountsIn(line: string): number[] {
  const amounts: number[] = []
  const pattern = new RegExp(MONEY_PATTERN.source, 'gi')
  for (const match of line.matchAll(pattern)) {
    const raw = match[1]
    if (!raw) continue
    try {
      const centavos = parsePesoToCentavos(raw)
      if (Number.isFinite(centavos)) amounts.push(centavos)
    } catch {
      // Ignore fragments that are not valid money.
    }
  }
  return amounts
}

function lastAmountIn(line: string): number | undefined {
  const amounts = amountsIn(line)
  return amounts.at(-1)
}

function normalizeDate(raw: string): string | undefined {
  const trimmed = raw.trim().replace(/\./g, '')

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const numeric = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/)
  if (numeric) {
    const [, first, second, year] = numeric
    let month = Number(first)
    let day = Number(second)
    if (month > 12) {
      month = Number(second)
      day = Number(first)
    }
    const fullYear = year.length === 2 ? `20${year}` : year
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  return undefined
}

function findKeywordAmount(
  lines: string[],
  keyword: RegExp
): { value?: number; line?: string } {
  for (const line of lines) {
    if (!keyword.test(line)) continue
    if (EXCLUDED.test(line) && !/grand\s+total/i.test(line)) continue
    const value = lastAmountIn(line)
    if (value !== undefined) return { value, line }
  }
  return {}
}

function findLineAmount(lines: string[], keyword: RegExp): number | undefined {
  for (const line of lines) {
    if (!keyword.test(line)) continue
    const value = lastAmountIn(line)
    if (value !== undefined) return value
  }
  return undefined
}

function looksLikeMerchant(line: string): boolean {
  if (!/[a-z]/i.test(line)) return false
  if (DATE_PATTERN.test(line)) return false
  if (/^[\d\s()+.-]+$/.test(line)) return false
  if (/(receipt|invoice|official|bir|tin|vat|tel|phone|address|street|ave|road|branch)/i.test(line)) {
    return false
  }
  return true
}

export function parseReceiptText(text: string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const warnings: string[] = []
  const merchant = lines.find(looksLikeMerchant)

  const dateMatch = text.match(DATE_PATTERN)
  const receiptDate = dateMatch ? normalizeDate(dateMatch[1]) : undefined

  const totalResult = findKeywordAmount(lines, TOTAL_KEYWORDS)
  let totalCentavos = totalResult.value

  if (totalCentavos === undefined) {
    const tail = lines
      .slice(Math.max(0, Math.floor(lines.length * 0.55)))
      .filter((line) => !DATE_PATTERN.test(line))
    const candidates = tail.flatMap(amountsIn).filter((amount) => amount > 0)
    if (candidates.length > 0) {
      totalCentavos = Math.max(...candidates)
      warnings.push('No total keyword found; using the largest amount near the bottom.')
    } else {
      warnings.push('No total could be detected. Enter the total manually.')
    }
  }

  const subtotalCentavos = findLineAmount(lines, /\bsub\s*total\b|\bsubtotal\b/i)
  const taxCentavos = findLineAmount(lines, /\bvat\b|\btax\b/i)
  const serviceCentavos = findLineAmount(lines, /\bservice\s+(charge|fee)\b/i)
  const discountCentavos = findLineAmount(lines, /\bdiscount\b/i)
  const tipCentavos = findLineAmount(lines, /\btip\b/i)

  const items: ParsedReceiptItem[] = []
  for (const line of lines) {
    if (TOTAL_KEYWORDS.test(line) || EXCLUDED.test(line)) continue
    if (DATE_PATTERN.test(line)) continue
    if (line === merchant) continue
    if (line.length < 4) continue

    const match = line.match(ITEM_PATTERN)
    if (!match) continue

    const description = match[1].trim()
    const amount = match[2]
    if (description.length < 2) continue

    let lineTotalCentavos = 0
    try {
      lineTotalCentavos = parsePesoToCentavos(amount)
    } catch {
      continue
    }
    if (lineTotalCentavos <= 0) continue

    const quantityMatch = description.match(/^(\d+(?:\.\d+)?)\s*[x@]\s*/i)
    const quantity = quantityMatch ? Number(quantityMatch[1]) : undefined
    const cleanedDescription = quantityMatch
      ? description.slice(quantityMatch[0].length).trim()
      : description

    items.push({
      description: cleanedDescription || description,
      quantity,
      unitPriceCentavos:
        quantity && quantity > 0 ? Math.round(lineTotalCentavos / quantity) : lineTotalCentavos,
      lineTotalCentavos,
      confidence: 0.55
    })
  }

  if (items.length > 0 && totalCentavos !== undefined) {
    const itemSum = items.reduce((sum, item) => sum + item.lineTotalCentavos, 0)
    if (itemSum !== totalCentavos) {
      const matchesSubtotal = subtotalCentavos !== undefined && itemSum === subtotalCentavos
      const explainedByCharges =
        subtotalCentavos !== undefined &&
        subtotalCentavos +
          (taxCentavos ?? 0) +
          (serviceCentavos ?? 0) +
          (tipCentavos ?? 0) -
          (discountCentavos ?? 0) ===
          totalCentavos

      if (!matchesSubtotal && !explainedByCharges) {
        warnings.push('Line items do not add up to the total. The confirmed total is authoritative.')
      }
    }
  }

  if (totalCentavos !== undefined && totalCentavos <= 0) {
    warnings.push('The detected total is not positive. Correct it before saving.')
    totalCentavos = undefined
  }

  return {
    merchant,
    receiptDate,
    subtotalCentavos,
    taxCentavos,
    serviceCentavos,
    discountCentavos,
    tipCentavos,
    totalCentavos,
    items,
    warnings,
    confidence:
      totalResult.value !== undefined ? 0.9 : totalCentavos !== undefined ? 0.45 : 0.15,
    parserVersion: PARSER_VERSION,
    rawText: text
  }
}

export function parseReceipt(result: OcrResult): ParsedReceipt {
  const text =
    result.lines.length > 0
      ? result.lines
          .slice()
          .sort((a, b) => a.bbox.y - b.bbox.y || a.bbox.x - b.bbox.x)
          .map((line) => line.text)
          .join('\n')
      : result.rawText

  const parsed = parseReceiptText(text)
  if (result.warnings.length > 0) {
    parsed.warnings.push(...result.warnings)
  }
  return parsed
}
