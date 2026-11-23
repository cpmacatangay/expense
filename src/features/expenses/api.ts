import { rpc } from "@/data/supabase/rpc";
import type {
  ExpenseDetail,
  ExpenseSummary,
  SaveExpensePayload,
  SaveExpenseResult
} from "./types";

export async function expensesForMe(): Promise<ExpenseSummary[]> {
  const data = await rpc<{ expenses: ExpenseSummary[] }>("expenses_for_me");
  return data.expenses ?? [];
}

export async function expenseDetail(expenseId: string): Promise<ExpenseDetail> {
  return rpc<ExpenseDetail>("expense_detail", { p_expense_id: expenseId });
}

export async function saveExpense(
  payload: SaveExpensePayload,
  expectedVersion: number | null
): Promise<SaveExpenseResult> {
  return rpc<SaveExpenseResult>("save_expense", {
    p_payload: payload,
    p_expected_version: expectedVersion
  });
}

export async function deleteExpense(expenseId: string): Promise<void> {
  await rpc("delete_expense", { p_expense_id: expenseId });
}
