import type {
  PairBalance,
  PairBalances,
  PairPayment,
  PairShare
} from "./types.ts";

function assertAmount(value: number, label: string) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer in centavos`);
  }
}

export function computePairBalances(
  me: string,
  shares: PairShare[],
  payments: PairPayment[]
): PairBalances {
  const net = new Map<string, number>();

  function add(other: string, amount: number) {
    assertAmount(Math.abs(amount), "Balance amount");
    net.set(other, (net.get(other) ?? 0) + amount);
  }

  for (const share of shares) {
    assertAmount(share.amountCentavos, "Share amount");
    if (share.debtorPersonId === me && share.payerPersonId !== me) {
      add(share.payerPersonId, share.amountCentavos);
    } else if (share.payerPersonId === me && share.debtorPersonId !== me) {
      add(share.debtorPersonId, -share.amountCentavos);
    }
  }

  for (const payment of payments) {
    if (payment.undone) continue;
    assertAmount(payment.amountCentavos, "Payment amount");
    if (payment.fromPersonId === me && payment.toPersonId !== me) {
      add(payment.toPersonId, -payment.amountCentavos);
    } else if (payment.toPersonId === me && payment.fromPersonId !== me) {
      add(payment.fromPersonId, payment.amountCentavos);
    }
  }

  const pairs: PairBalance[] = [...net.entries()]
    .filter(([, amount]) => amount !== 0)
    .map(([otherPersonId, amountCentavos]) => ({ otherPersonId, amountCentavos }))
    .sort(
      (a, b) =>
        Math.abs(b.amountCentavos) - Math.abs(a.amountCentavos) ||
        a.otherPersonId.localeCompare(b.otherPersonId)
    );

  return {
    youOweCentavos: pairs.reduce(
      (sum, pair) => sum + (pair.amountCentavos > 0 ? pair.amountCentavos : 0),
      0
    ),
    owedToYouCentavos: pairs.reduce(
      (sum, pair) => sum + (pair.amountCentavos < 0 ? -pair.amountCentavos : 0),
      0
    ),
    pairs
  };
}
