import type { PersonStatus } from "@/features/people/types";

export type ExpenseSummary = {
  id: string;
  description: string;
  expenseDate: string;
  payerPersonId: string;
  payerName: string;
  totalCentavos: number;
  myShareCentavos: number;
  createdAt: string;
};

export type ExpensePerson = {
  id: string;
  displayName: string;
  status: PersonStatus;
  hasQr: boolean;
  isPayer: boolean;
  isCreator: boolean;
};

export type ExpenseItem = {
  id: string;
  name: string;
  amountCentavos: number;
  assignedPersonId: string;
  position: number;
};

export type ExpenseCoverage = {
  coveredPersonId: string;
  covererPersonId: string;
};

export type ExpenseShare = {
  personId: string;
  itemsCentavos: number;
  coveredCentavos: number;
  owedCentavos: number;
  coveredByPersonId: string | null;
};

export type ExpenseEventValue = {
  description?: string;
  expenseDate?: string;
  payerPersonId?: string;
  payerName?: string;
  totalCentavos?: number;
  people?: { personId: string; displayName: string }[];
  items?: {
    name: string;
    amountCentavos: number;
    assignedPersonId: string;
    assignedName: string;
  }[];
  coverage?: {
    coveredPersonId: string;
    coveredName: string;
    covererPersonId: string;
    covererName: string;
  }[];
};

export type ExpenseEvent = {
  id: string;
  actorPersonId: string;
  actorName: string;
  action: "created" | "updated" | "deleted";
  before: ExpenseEventValue | null;
  after: ExpenseEventValue | null;
  createdAt: string;
};

export type ExpenseDetail = {
  expense: {
    id: string;
    description: string;
    expenseDate: string;
    payerPersonId: string;
    createdByPersonId: string;
    totalCentavos: number;
    version: number;
    createdAt: string;
    updatedAt: string;
    canEdit: boolean;
  };
  people: ExpensePerson[];
  items: ExpenseItem[];
  coverage: ExpenseCoverage[];
  shares: ExpenseShare[];
  events: ExpenseEvent[];
};

export type SaveExpenseItem = {
  name: string;
  amountCentavos: number;
  assignedPersonId: string;
};

export type SaveExpensePayload = {
  id?: string | null;
  description: string;
  expenseDate: string;
  payerPersonId: string;
  people: string[];
  items: SaveExpenseItem[];
  coverage: ExpenseCoverage[];
};

export type SaveExpenseResult = {
  expenseId: string;
  version: number;
  totalCentavos: number;
  shares: ExpenseShare[];
};
