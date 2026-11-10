import { MoneyValidationError } from "./validate.ts";

/**
 * Split an integer total across weights with largest-remainder rounding.
 * The returned amounts always sum exactly to `total`.
 */
export function largestRemainder(total: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0) {
    throw new MoneyValidationError("Allocation total must be a non-negative integer");
  }

  if (weights.length === 0) {
    if (total !== 0) {
      throw new MoneyValidationError("Cannot allocate a total across zero weights");
    }
    return [];
  }

  if (weights.some((weight) => !Number.isFinite(weight) || weight < 0)) {
    throw new MoneyValidationError("Allocation weights must be non-negative");
  }

  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const normalized = weightSum === 0 ? weights.map(() => 1) : weights;
  const normalizedSum = weightSum === 0 ? normalized.length : weightSum;

  const quotas = normalized.map((weight) => (total * weight) / normalizedSum);
  const amounts = quotas.map((quota) => Math.floor(quota));
  const assigned = amounts.reduce((sum, amount) => sum + amount, 0);
  const remaining = total - assigned;

  const order = quotas
    .map((quota, index) => ({ index, fraction: quota - Math.floor(quota) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let index = 0; index < remaining; index += 1) {
    amounts[order[index % order.length].index] += 1;
  }

  return amounts;
}
