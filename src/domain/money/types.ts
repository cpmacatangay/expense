export type Centavos = number;

export type ExpenseItemInput = {
  name: string;
  amountCentavos: Centavos;
  assignedPersonId: string;
};

export type ExpenseCoverageInput = {
  coveredPersonId: string;
  covererPersonId: string;
};

export type ExpenseDraft = {
  creatorPersonId: string;
  payerPersonId: string;
  people: string[];
  items: ExpenseItemInput[];
  coverage: ExpenseCoverageInput[];
};

export type ExpenseShare = {
  personId: string;
  itemsCentavos: Centavos;
  coveredCentavos: Centavos;
  owedCentavos: Centavos;
  coveredByPersonId: string | null;
};

export type ExpenseSharesResult = {
  totalCentavos: Centavos;
  shares: ExpenseShare[];
};
