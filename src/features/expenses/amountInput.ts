export function centsToInput(centavos: number) {
  return centavos > 0 ? (centavos / 100).toFixed(2) : "";
}

export function isAmountInput(value: string) {
  return /^\d*(?:\.\d{0,2})?$/.test(value);
}

export function parseAmountInput(value: string) {
  const parsed = Math.round(Number(value || "0") * 100);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}
