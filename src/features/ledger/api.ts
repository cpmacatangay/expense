import { rpc } from "@/data/supabase/rpc";
import type { Ledger, PairHistory, Payment } from "./types";

export async function ledgerForMe(): Promise<Ledger> {
  return rpc<Ledger>("ledger_for_me");
}

export async function pairHistory(otherPersonId: string): Promise<PairHistory> {
  return rpc<PairHistory>("pair_history", { p_other_person_id: otherPersonId });
}

export async function markPaid(otherPersonId: string): Promise<Payment> {
  return rpc<Payment>("mark_paid", { p_other_person_id: otherPersonId });
}

export async function undoPayment(paymentId: string): Promise<Payment> {
  return rpc<Payment>("undo_payment", { p_payment_id: paymentId });
}
