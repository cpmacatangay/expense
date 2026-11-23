import { rpc } from "@/data/supabase/rpc";

export type ExpenseShare = {
  token: string;
  expiresAt: string;
};

export type ExpenseSharePerson = {
  personId: string;
  displayName: string;
};

export type ExpenseSharePreview = {
  expenseId: string;
  description: string;
  expenseDate: string;
  payerName: string;
  totalCentavos: number;
  expiresAt: string;
  alreadyParticipant: boolean;
  peopleCount: number;
  unclaimed: ExpenseSharePerson[];
};

export type ClaimShareResult = {
  expenseId: string;
  personId: string;
  alreadyClaimed: boolean;
};

export async function createExpenseShare(
  expenseId: string,
  refresh = false
): Promise<ExpenseShare> {
  return rpc<ExpenseShare>("create_expense_share", {
    p_expense_id: expenseId,
    p_refresh: refresh
  });
}

export async function expenseSharePreview(token: string): Promise<ExpenseSharePreview> {
  return rpc<ExpenseSharePreview>("expense_share_preview", { p_token: token });
}

export async function claimExpenseShare(
  token: string,
  personId: string
): Promise<ClaimShareResult> {
  return rpc<ClaimShareResult>("claim_expense_share", {
    p_token: token,
    p_person_id: personId
  });
}

export function expenseShareUrl(token: string): string {
  return `${window.location.origin}/join/${encodeURIComponent(token)}`;
}
