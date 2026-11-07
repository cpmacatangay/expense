const pesoFormatter = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

export function parsePesoToCentavos(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Invalid amount')
    return Math.round(input * 100)
  }

  const cleaned = input
    .trim()
    .replace(/[₱,\s]/g, '')
    .replace(/^PHP/i, '')
    .replace(/^P/i, '')

  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error('Enter a valid amount')
  }

  const negative = cleaned.startsWith('-')
  const [whole, fraction = ''] = cleaned.replace('-', '').split('.')
  const pesos = Number(whole || '0')
  const cents = Number((fraction + '00').slice(0, 2))
  const value = pesos * 100 + cents
  if (!Number.isSafeInteger(value)) throw new Error('Amount is too large')
  return negative ? -value : value
}

export function formatCentavos(centavos: number): string {
  return pesoFormatter.format(centavos / 100)
}

export function formatCentavosPlain(centavos: number): string {
  return (centavos / 100).toFixed(2)
}

export function sumCentavos(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

export function isPositiveCentavos(value: number): boolean {
  return Number.isInteger(value) && value > 0
}
