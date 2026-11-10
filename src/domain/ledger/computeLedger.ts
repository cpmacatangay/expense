export type SettlementStatus = "pending" | "confirmed" | "declined" | "void";

export type LedgerOuting = {
  id: string;
  payerAdultId: string | null;
  totalCentavos: number;
  shares: { adultId: string; totalCentavos: number }[];
};

export type LedgerSettlement = {
  id: string;
  fromAdultId: string;
  toAdultId: string;
  amountCentavos: number;
  status: SettlementStatus;
};

export type LedgerTransfer = {
  fromAdultId: string;
  toAdultId: string;
  amountCentavos: number;
};

export type LedgerResult = {
  /** Positive means the group owes this adult; negative means the adult owes the group. */
  netByAdult: Record<string, number>;
  /** The smallest set of payments that clears every net balance. */
  transfers: LedgerTransfer[];
};

function assertCentavos(value: number, label: string) {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${label} must be whole centavos`);
  }
}

export function computeLedger(input: {
  adultIds: string[];
  outings: LedgerOuting[];
  settlements: LedgerSettlement[];
}): LedgerResult {
  const net = new Map<string, number>();

  for (const id of input.adultIds) net.set(id, 0);

  function add(adultId: string, amount: number) {
    assertCentavos(amount, "Balance amount");
    net.set(adultId, (net.get(adultId) ?? 0) + amount);
  }

  for (const outing of input.outings) {
    assertCentavos(outing.totalCentavos, "Outing total");

    let shareSum = 0;
    for (const share of outing.shares) {
      assertCentavos(share.totalCentavos, "Share amount");
      shareSum += share.totalCentavos;
    }

    if (shareSum !== outing.totalCentavos) {
      throw new Error("Shares do not sum to the outing total");
    }

    if (!outing.payerAdultId) {
      throw new Error("A finalized outing needs a payer");
    }

    add(outing.payerAdultId, outing.totalCentavos);
    for (const share of outing.shares) add(share.adultId, -share.totalCentavos);
  }

  for (const settlement of input.settlements) {
    if (settlement.status !== "confirmed") continue;
    assertCentavos(settlement.amountCentavos, "Settlement amount");
    if (settlement.amountCentavos <= 0) {
      throw new Error("A confirmed settlement must be greater than zero");
    }
    add(settlement.fromAdultId, settlement.amountCentavos);
    add(settlement.toAdultId, -settlement.amountCentavos);
  }

  const netByAdult = Object.fromEntries(net);
  return { netByAdult, transfers: settleTransfers(netByAdult) };
}

/** Turn signed net balances into the smallest set of payments that clears them. */
export function settleTransfers(netByAdult: Record<string, number>): LedgerTransfer[] {
  const creditors: { adultId: string; amount: number }[] = [];
  const debtors: { adultId: string; amount: number }[] = [];

  for (const [adultId, amount] of Object.entries(netByAdult)) {
    assertCentavos(amount, "Balance amount");
    if (amount > 0) creditors.push({ adultId, amount });
    else if (amount < 0) debtors.push({ adultId, amount: -amount });
  }

  const order = (a: { adultId: string; amount: number }, b: typeof a) =>
    b.amount - a.amount || a.adultId.localeCompare(b.adultId);

  creditors.sort(order);
  debtors.sort(order);

  const transfers: LedgerTransfer[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.amount, creditor.amount);

    if (amount > 0) {
      transfers.push({
        fromAdultId: debtor.adultId,
        toAdultId: creditor.adultId,
        amountCentavos: amount
      });
    }

    debtor.amount -= amount;
    creditor.amount -= amount;
    if (debtor.amount === 0) debtorIndex += 1;
    if (creditor.amount === 0) creditorIndex += 1;
  }

  return transfers;
}
