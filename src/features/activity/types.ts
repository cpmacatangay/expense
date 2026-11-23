export type ActivityKind =
  | "expense_created"
  | "expense_updated"
  | "expense_deleted"
  | "payment_marked"
  | "payment_undone";

export type ActivityEvent = {
  id: string;
  kind: ActivityKind;
  createdAt: string;
  actorName: string;
  expenseId: string | null;
  expenseDescription: string | null;
  otherPersonId: string | null;
  otherName: string | null;
  amountCentavos: number | null;
  summary: string;
};
