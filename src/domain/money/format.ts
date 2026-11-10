export function formatPeso(centavos: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(centavos / 100);
}

export function parsePesoToCentavos(value: string): number {
  const normalized = value.replace(/[^\d.]/g, "");
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Enter a valid amount");
  }
  return Math.round(amount * 100);
}
