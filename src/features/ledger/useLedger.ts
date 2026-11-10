import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { computeLedger, type LedgerResult } from "@/domain/ledger/computeLedger";
import type { Adult } from "@/features/groups/types";
import { loadLedger } from "./api";
import type { LedgerData } from "./types";

export function useLedger(groupId: string | undefined) {
  return useQuery({
    queryKey: ["ledger", groupId],
    queryFn: () => loadLedger(groupId as string),
    enabled: Boolean(groupId)
  });
}

export function buildLedger(data: LedgerData, adults: Adult[]): LedgerResult {
  const sharesByOuting = new Map<string, { adultId: string; totalCentavos: number }[]>();

  for (const share of data.shares) {
    const list = sharesByOuting.get(share.outing_id) ?? [];
    list.push({ adultId: share.adult_id, totalCentavos: share.total_centavos });
    sharesByOuting.set(share.outing_id, list);
  }

  return computeLedger({
    adultIds: adults.map((adult) => adult.id),
    outings: data.outings.map((outing) => ({
      id: outing.id,
      payerAdultId: outing.payer_adult_id,
      totalCentavos: outing.total_centavos,
      shares: sharesByOuting.get(outing.id) ?? []
    })),
    settlements: data.settlements.map((settlement) => ({
      id: settlement.id,
      fromAdultId: settlement.from_adult_id,
      toAdultId: settlement.to_adult_id,
      amountCentavos: settlement.amount_centavos,
      status: settlement.status
    }))
  });
}

export function useLedgerView(groupId: string | undefined, adults: Adult[]) {
  const query = useLedger(groupId);
  const ledger = useMemo(
    () => (query.data && adults.length > 0 ? buildLedger(query.data, adults) : null),
    [query.data, adults]
  );

  return { ...query, ledger };
}
