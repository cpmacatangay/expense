export type PairShare = {
  expenseId?: string;
  payerPersonId: string;
  debtorPersonId: string;
  amountCentavos: number;
};

export type PairPayment = {
  id?: string;
  fromPersonId: string;
  toPersonId: string;
  amountCentavos: number;
  undone?: boolean;
};

export type PairBalance = {
  otherPersonId: string;
  /** Positive means the viewer owes the other person. */
  amountCentavos: number;
};

export type PairBalances = {
  youOweCentavos: number;
  owedToYouCentavos: number;
  pairs: PairBalance[];
};
