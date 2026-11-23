import type {
  Centavos,
  ExpenseDraft,
  ExpenseShare,
  ExpenseSharesResult
} from "./types.ts";
import { assertCentavos, assertPositiveCentavos, MoneyValidationError } from "./validate.ts";

export function computeExpenseShares(draft: ExpenseDraft): ExpenseSharesResult {
  const people = [...draft.people];
  if (people.length < 2 || people.length > 12) {
    throw new MoneyValidationError("Choose between 2 and 12 people");
  }
  if (new Set(people).size !== people.length) {
    throw new MoneyValidationError("People must be unique");
  }
  if (!people.includes(draft.creatorPersonId)) {
    throw new MoneyValidationError("The creator must be on the expense");
  }
  if (!people.includes(draft.payerPersonId)) {
    throw new MoneyValidationError("Choose a payer who is on the expense");
  }
  if (draft.items.length < 1 || draft.items.length > 50) {
    throw new MoneyValidationError("Add at least one item");
  }

  const gross = new Map<string, Centavos>(people.map((person) => [person, 0]));
  let totalCentavos = 0;

  for (const item of draft.items) {
    const name = item.name.trim();
    if (name.length < 1 || name.length > 120) {
      throw new MoneyValidationError("Every item needs a name");
    }
    assertPositiveCentavos(item.amountCentavos, "Item amount");
    if (!people.includes(item.assignedPersonId)) {
      throw new MoneyValidationError("That item belongs to someone not on this expense");
    }
    totalCentavos += item.amountCentavos;
    gross.set(
      item.assignedPersonId,
      (gross.get(item.assignedPersonId) ?? 0) + item.amountCentavos
    );
  }

  if (totalCentavos <= 0) {
    throw new MoneyValidationError("The expense total must be greater than zero");
  }

  const coveredBy = new Map<string, string>();
  const coverers = new Set<string>();

  for (const coverage of draft.coverage) {
    const { coveredPersonId, covererPersonId } = coverage;
    if (!people.includes(coveredPersonId) || !people.includes(covererPersonId)) {
      throw new MoneyValidationError("That coverage is not allowed");
    }
    if (coveredPersonId === covererPersonId) {
      throw new MoneyValidationError("A person cannot cover themselves");
    }
    if (coveredPersonId === draft.payerPersonId) {
      throw new MoneyValidationError("The payer cannot be covered");
    }
    if (coveredBy.has(coveredPersonId)) {
      throw new MoneyValidationError("Each person needs one coverer");
    }
    if (coveredBy.has(covererPersonId)) {
      throw new MoneyValidationError("A coverer cannot also be covered");
    }
    if (coverers.has(coveredPersonId)) {
      throw new MoneyValidationError("A covered person cannot cover someone");
    }
    coveredBy.set(coveredPersonId, covererPersonId);
    coverers.add(covererPersonId);
  }

  const shares: ExpenseShare[] = people.map((person) => {
    const itemsCentavos = gross.get(person) ?? 0;
    const coveredByPersonId = coveredBy.get(person) ?? null;
    if (coveredByPersonId) {
      return {
        personId: person,
        itemsCentavos,
        coveredCentavos: 0,
        owedCentavos: 0,
        coveredByPersonId
      };
    }

    let coveredCentavos = 0;
    for (const [coveredPerson, coverer] of coveredBy) {
      if (coverer === person) {
        coveredCentavos += gross.get(coveredPerson) ?? 0;
      }
    }

    return {
      personId: person,
      itemsCentavos,
      coveredCentavos,
      owedCentavos: itemsCentavos + coveredCentavos,
      coveredByPersonId: null
    };
  });

  const owedSum = shares.reduce((sum, share) => sum + share.owedCentavos, 0);
  assertCentavos(owedSum, "Share sum");
  if (owedSum !== totalCentavos) {
    throw new MoneyValidationError("Shares do not sum to the total");
  }

  return { totalCentavos, shares };
}
