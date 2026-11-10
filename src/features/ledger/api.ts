import { requireSupabase } from "@/data/supabase/client";
import type { LedgerData, LedgerOutingRow, LedgerShareRow, Settlement, SettlementStatus } from "./types";

export async function loadLedger(groupId: string): Promise<LedgerData> {
  const client = requireSupabase();

  const { data: outings, error: outingError } = await client
    .from("outings")
    .select("id, date, place, payer_adult_id, total_centavos, status")
    .eq("group_id", groupId)
    .eq("status", "finalized")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (outingError) throw outingError;

  const rows = (outings ?? []) as LedgerOutingRow[];
  let shares: LedgerShareRow[] = [];

  if (rows.length > 0) {
    const { data: shareRows, error: shareError } = await client
      .from("shares")
      .select("outing_id, adult_id, total_centavos")
      .in(
        "outing_id",
        rows.map((outing) => outing.id)
      );
    if (shareError) throw shareError;
    shares = (shareRows ?? []) as LedgerShareRow[];
  }

  const { data: settlements, error: settlementError } = await client
    .from("settlements")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false });

  if (settlementError) throw settlementError;

  return {
    outings: rows,
    shares,
    settlements: (settlements ?? []) as Settlement[]
  };
}

export async function recordSettlement(input: {
  groupId: string;
  fromAdultId: string;
  toAdultId: string;
  amountCentavos: number;
  date?: string | null;
  note?: string | null;
}): Promise<Settlement> {
  const { data, error } = await requireSupabase().rpc("record_settlement", {
    p_group_id: input.groupId,
    p_from_adult_id: input.fromAdultId,
    p_to_adult_id: input.toAdultId,
    p_amount_centavos: input.amountCentavos,
    p_date: input.date || null,
    p_note: input.note?.trim() || null
  });

  if (error) throw error;
  return data as Settlement;
}

export async function decideSettlement(
  settlementId: string,
  decision: Extract<SettlementStatus, "confirmed" | "declined">,
  note?: string | null
): Promise<Settlement> {
  const { data, error } = await requireSupabase().rpc("decide_settlement", {
    p_settlement_id: settlementId,
    p_decision: decision,
    p_note: note?.trim() || null
  });

  if (error) throw error;
  return data as Settlement;
}

export async function voidSettlement(
  settlementId: string,
  note?: string | null
): Promise<Settlement> {
  const { data, error } = await requireSupabase().rpc("void_settlement", {
    p_settlement_id: settlementId,
    p_note: note?.trim() || null
  });

  if (error) throw error;
  return data as Settlement;
}
