export class MoneyValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyValidationError";
  }
}

export function assertCentavos(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new MoneyValidationError(`${label} must be a non-negative integer in centavos`);
  }
}

export function assertPositiveCentavos(value: unknown, label: string): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    throw new MoneyValidationError(`${label} must be a positive integer in centavos`);
  }
}
