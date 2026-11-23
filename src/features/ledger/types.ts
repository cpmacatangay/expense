export type DebtDirection = "you_owe" | "owes_you";

export type Debt = {
  otherPersonId: string;
  otherName: string;
  direction: DebtDirection;
  amountCentavos: number;
  hasQr: boolean;
  qrPath: string | null;
};

export type Ledger = {
  youOweCentavos: number;
  owedToYouCentavos: number;
  debts: Debt[];
};

export type Payment = {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  amountCentavos: number;
  markedByPersonId: string;
  markedAt: string;
  undoneAt: string | null;
  undoneByPersonId: string | null;
};

export type PairHistory = {
  other: {
    id: string;
    displayName: string;
    hasQr: boolean;
    qrPath: string | null;
  };
  payments: Payment[];
};
