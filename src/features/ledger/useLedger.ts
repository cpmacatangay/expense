import { useQuery } from "@tanstack/react-query";
import { ledgerForMe } from "./api";

export function useLedger() {
  return useQuery({
    queryKey: ["ledger"],
    queryFn: ledgerForMe,
    staleTime: 15_000
  });
}
