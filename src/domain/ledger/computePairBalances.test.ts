import { describe, expect, it } from "vitest";
import { computePairBalances } from "./computePairBalances.ts";

describe("computePairBalances", () => {
  it("nets one direction per pair", () => {
    const result = computePairBalances(
      "a",
      [
        { payerPersonId: "b", debtorPersonId: "a", amountCentavos: 50000 },
        { payerPersonId: "a", debtorPersonId: "b", amountCentavos: 20000 }
      ],
      []
    );
    expect(result.pairs).toEqual([
      { otherPersonId: "b", amountCentavos: 30000 }
    ]);
    expect(result.youOweCentavos).toBe(30000);
    expect(result.owedToYouCentavos).toBe(0);
  });

  it("applies payments to the pair", () => {
    const result = computePairBalances(
      "a",
      [{ payerPersonId: "b", debtorPersonId: "a", amountCentavos: 30000 }],
      [{ fromPersonId: "a", toPersonId: "b", amountCentavos: 30000 }]
    );
    expect(result.pairs).toEqual([]);
    expect(result.youOweCentavos).toBe(0);
  });

  it("restores a pair when a payment is undone", () => {
    const result = computePairBalances(
      "a",
      [{ payerPersonId: "b", debtorPersonId: "a", amountCentavos: 30000 }],
      [
        {
          fromPersonId: "a",
          toPersonId: "b",
          amountCentavos: 30000,
          undone: true
        }
      ]
    );
    expect(result.pairs[0]).toEqual({
      otherPersonId: "b",
      amountCentavos: 30000
    });
  });

  it("ignores pairs that do not include the viewer", () => {
    const result = computePairBalances(
      "a",
      [{ payerPersonId: "b", debtorPersonId: "c", amountCentavos: 30000 }],
      []
    );
    expect(result.pairs).toEqual([]);
  });

  it("flips direction when payments exceed the shares", () => {
    const result = computePairBalances(
      "a",
      [{ payerPersonId: "b", debtorPersonId: "a", amountCentavos: 20000 }],
      [{ fromPersonId: "a", toPersonId: "b", amountCentavos: 50000 }]
    );
    expect(result.pairs[0]).toEqual({
      otherPersonId: "b",
      amountCentavos: -30000
    });
    expect(result.owedToYouCentavos).toBe(30000);
  });
});
