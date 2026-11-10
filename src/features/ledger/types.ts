import type { SettlementStatus } from "@/domain/ledger/computeLedger";

export type { SettlementStatus };

export type Settlement = {
  id: string;
  group_id: string;
  from_adult_id: string;
  to_adult_id: string;
  amount_centavos: number;
  date: string;
  note: string | null;
  status: SettlementStatus;
  recorded_by: string;
  confirmed_by: string | null;
  decided_at: string | null;
  decline_reason: string | null;
  voided_at: string | null;
  voided_by: string | null;
  created_at: string;
};

export type LedgerOutingRow = {
  id: string;
  date: string;
  place: string | null;
  payer_adult_id: string | null;
  total_centavos: number;
  status: "finalized";
};

export type LedgerShareRow = {
  outing_id: string;
  adult_id: string;
  total_centavos: number;
};

export type LedgerData = {
  outings: LedgerOutingRow[];
  shares: LedgerShareRow[];
  settlements: Settlement[];
};
