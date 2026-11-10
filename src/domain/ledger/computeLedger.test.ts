import { describe, expect, it } from "vitest";
import { computeLedger, type LedgerOuting, type LedgerSettlement } from "./computeLedger";

const outing = (
  payer: string,
  total: number,
  shares: Record<string, number>
): LedgerOuting => ({
  id: `outing-${payer}`,
  payerAdultId: payer,
  totalCentavos: total,
  shares: Object.entries(shares).map(([adultId, totalCentavos]) => ({ adultId, totalCentavos }))
});

const settlement = (
  id: string,
  from: string,
  to: string,
  amount: number,
  status: LedgerSettlement["status"]
): LedgerSettlement => ({
  id,
  fromAdultId: from,
  toAdultId: to,
  amountCentavos: amount,
  status
});

describe("computeLedger", () => {
  it("credits the payer and debits each share", () => {
    const result = computeLedger({
      adultIds: ["a", "b", "c"],
      outings: [outing("a", 90000, { a: 30000, b: 30000, c: 30000 })],
      settlements: []
    });

    expect(result.netByAdult).toEqual({ a: 60000, b: -30000, c: -30000 });
    expect(result.transfers).toEqual([
      { fromAdultId: "b", toAdultId: "a", amountCentavos: 30000 },
      { fromAdultId: "c", toAdultId: "a", amountCentavos: 30000 }
    ]);
  });

  it("nets debts across several outings", () => {
    const result = computeLedger({
      adultIds: ["a", "b"],
      outings: [
        outing("a", 10000, { a: 5000, b: 5000 }),
        outing("b", 40000, { a: 20000, b: 20000 })
      ],
      settlements: []
    });

    expect(result.netByAdult).toEqual({ a: -15000, b: 15000 });
    expect(result.transfers).toEqual([
      { fromAdultId: "a", toAdultId: "b", amountCentavos: 15000 }
    ]);
  });

  it("only counts confirmed settlements", () => {
    const base = {
      adultIds: ["a", "b"],
      outings: [outing("a", 10000, { a: 5000, b: 5000 })]
    };

    const pending = computeLedger({
      ...base,
      settlements: [settlement("s1", "b", "a", 5000, "pending")]
    });
    expect(pending.netByAdult).toEqual({ a: 5000, b: -5000 });

    for (const status of ["declined", "void", "pending"] as const) {
      const result = computeLedger({
        ...base,
        settlements: [settlement("s2", "b", "a", 5000, status)]
      });
      expect(result.netByAdult).toEqual({ a: 5000, b: -5000 });
    }

    const confirmed = computeLedger({
      ...base,
      settlements: [settlement("s3", "b", "a", 5000, "confirmed")]
    });
    expect(confirmed.netByAdult).toEqual({ a: 0, b: 0 });
    expect(confirmed.transfers).toEqual([]);
  });

  it("applies partial settlements", () => {
    const result = computeLedger({
      adultIds: ["a", "b"],
      outings: [outing("a", 10000, { a: 5000, b: 5000 })],
      settlements: [settlement("s1", "b", "a", 2000, "confirmed")]
    });

    expect(result.netByAdult).toEqual({ a: 3000, b: -3000 });
    expect(result.transfers).toEqual([
      { fromAdultId: "b", toAdultId: "a", amountCentavos: 3000 }
    ]);
  });

  it("keeps balances at zero when everyone is square", () => {
    const result = computeLedger({ adultIds: ["a", "b"], outings: [], settlements: [] });
    expect(result.netByAdult).toEqual({ a: 0, b: 0 });
    expect(result.transfers).toEqual([]);
  });

  it("rejects shares that do not match the total", () => {
    expect(() =>
      computeLedger({
        adultIds: ["a", "b"],
        outings: [outing("a", 10000, { a: 4000, b: 5000 })],
        settlements: []
      })
    ).toThrow("Shares do not sum to the outing total");
  });

  it("rejects a finalized outing without a payer", () => {
    expect(() =>
      computeLedger({
        adultIds: ["a"],
        outings: [{ id: "x", payerAdultId: null, totalCentavos: 0, shares: [] }],
        settlements: []
      })
    ).toThrow("A finalized outing needs a payer");
  });

  it("always produces transfers that clear all balances", () => {
    const result = computeLedger({
      adultIds: ["a", "b", "c", "d"],
      outings: [
        outing("a", 12345, { a: 1234, b: 2345, c: 3456, d: 5310 }),
        outing("c", 9999, { a: 3333, b: 3333, c: 0, d: 3333 })
      ],
      settlements: [settlement("s1", "d", "a", 1000, "confirmed")]
    });

    const net = { ...result.netByAdult };
    for (const transfer of result.transfers) {
      net[transfer.fromAdultId] += transfer.amountCentavos;
      net[transfer.toAdultId] -= transfer.amountCentavos;
    }

    expect(Object.values(net).every((value) => value === 0)).toBe(true);
    expect(result.transfers.every((transfer) => transfer.amountCentavos > 0)).toBe(true);
  });
});
