import { assertPositiveCentavos, MoneyValidationError } from "./validate.ts";

/**
 * Split a total into exact integer-centavo lines, one per person.
 *
 * The first `remainder` people in display order receive one extra centavo,
 * so the lines always sum exactly to the total.
 */
export function splitEvenly(totalCentavos: number, peopleCount: number): number[] {
  assertPositiveCentavos(totalCentavos, "Split total");

  if (!Number.isSafeInteger(peopleCount) || peopleCount < 2 || peopleCount > 12) {
    throw new MoneyValidationError("Choose between 2 and 12 people");
  }
  if (totalCentavos < peopleCount) {
    throw new MoneyValidationError(
      "The total is too small to split across these people"
    );
  }

  const base = Math.floor(totalCentavos / peopleCount);
  const remainder = totalCentavos % peopleCount;

  return Array.from({ length: peopleCount }, (_, index) =>
    index < remainder ? base + 1 : base
  );
}
