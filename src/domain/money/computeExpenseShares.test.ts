import { describe, expect, it } from "vitest";
import { computeExpenseShares } from "./computeExpenseShares.ts";
import { MoneyValidationError } from "./validate.ts";

const people = ["a", "b", "c"];

function draft(overrides: Partial<Parameters<typeof computeExpenseShares>[0]> = {}) {
  return {
    creatorPersonId: "a",
    payerPersonId: "a",
    people,
    items: [
      { name: "Pasta", amountCentavos: 30000, assignedPersonId: "a" },
      { name: "Pizza", amountCentavos: 20000, assignedPersonId: "b" },
      { name: "Salad", amountCentavos: 10000, assignedPersonId: "c" }
    ],
    coverage: [],
    ...overrides
  };
}

describe("computeExpenseShares", () => {
  it("charges each item to its assigned person", () => {
    const result = computeExpenseShares(draft());
    expect(result.totalCentavos).toBe(60000);
    expect(result.shares.find((share) => share.personId === "a")?.owedCentavos).toBe(30000);
    expect(result.shares.find((share) => share.personId === "b")?.owedCentavos).toBe(20000);
    expect(result.shares.find((share) => share.personId === "c")?.owedCentavos).toBe(10000);
  });

  it("moves a covered share to the coverer", () => {
    const result = computeExpenseShares(
      draft({ coverage: [{ coveredPersonId: "c", covererPersonId: "b" }] })
    );
    expect(result.shares.find((share) => share.personId === "b")?.owedCentavos).toBe(30000);
    expect(result.shares.find((share) => share.personId === "c")?.owedCentavos).toBe(0);
    expect(result.shares.find((share) => share.personId === "c")?.coveredByPersonId).toBe("b");
  });

  it("lets the payer absorb a covered share", () => {
    const result = computeExpenseShares(
      draft({ coverage: [{ coveredPersonId: "c", covererPersonId: "a" }] })
    );
    expect(result.shares.find((share) => share.personId === "a")?.owedCentavos).toBe(40000);
    expect(result.shares.find((share) => share.personId === "c")?.owedCentavos).toBe(0);
  });

  it("rejects a chain", () => {
    expect(() =>
      computeExpenseShares(
        draft({
          coverage: [
            { coveredPersonId: "c", covererPersonId: "b" },
            { coveredPersonId: "b", covererPersonId: "a" }
          ]
        })
      )
    ).toThrow(MoneyValidationError);
  });

  it("rejects payer coverage and self coverage", () => {
    expect(() =>
      computeExpenseShares(
        draft({ coverage: [{ coveredPersonId: "a", covererPersonId: "b" }] })
      )
    ).toThrow("The payer cannot be covered");
    expect(() =>
      computeExpenseShares(
        draft({ coverage: [{ coveredPersonId: "b", covererPersonId: "b" }] })
      )
    ).toThrow("A person cannot cover themselves");
  });

  it("rejects an item assigned off the expense", () => {
    expect(() =>
      computeExpenseShares(
        draft({
          items: [{ name: "Pasta", amountCentavos: 1000, assignedPersonId: "z" }]
        })
      )
    ).toThrow("That item belongs to someone not on this expense");
  });

  it("stays exact across seeded random expenses", () => {
    let seed = 20261117;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 2 ** 32;
    };

    for (let run = 0; run < 250; run += 1) {
      const count = 2 + Math.floor(random() * 11);
      const members = Array.from({ length: count }, (_, index) => `p${index}`);
      const payer = members[Math.floor(random() * members.length)];
      const items = Array.from(
        { length: 1 + Math.floor(random() * 10) },
        (_, index) => ({
          name: `Item ${index}`,
          amountCentavos: 1 + Math.floor(random() * 100000),
          assignedPersonId: members[Math.floor(random() * members.length)]
        })
      );

      const coverers = members.filter((member) => member !== payer);
      const covered = [...coverers].sort(() => random() - 0.5);
      const coverage: { coveredPersonId: string; covererPersonId: string }[] = [];
      const used = new Set<string>();
      const covererPool = coverers.filter(() => random() > 0.5);

      for (const coveredPerson of covered) {
        if (used.has(coveredPerson)) continue;
        const coverer = covererPool.find(
          (candidate) =>
            candidate !== coveredPerson &&
            candidate !== payer &&
            !used.has(candidate)
        );
        if (!coverer) break;
        if (random() > 0.55) continue;
        coverage.push({ coveredPersonId: coveredPerson, covererPersonId: coverer });
        used.add(coveredPerson);
        used.add(coverer);
      }

      const result = computeExpenseShares({
        creatorPersonId: members[0],
        payerPersonId: payer,
        people: members,
        items,
        coverage
      });

      const total = items.reduce((sum, item) => sum + item.amountCentavos, 0);
      const owed = result.shares.reduce((sum, share) => sum + share.owedCentavos, 0);
      expect(result.totalCentavos).toBe(total);
      expect(owed).toBe(total);
      for (const share of result.shares) {
        if (share.coveredByPersonId) expect(share.owedCentavos).toBe(0);
      }
    }
  });
});
