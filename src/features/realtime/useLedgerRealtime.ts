import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";

export function useLedgerRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["expenses"] });
      void queryClient.invalidateQueries({ queryKey: ["expense"] });
      void queryClient.invalidateQueries({ queryKey: ["ledger"] });
      void queryClient.invalidateQueries({ queryKey: ["pair"] });
      void queryClient.invalidateQueries({ queryKey: ["activity"] });
      void queryClient.invalidateQueries({ queryKey: ["people"] });
    };

    const channel = client
      .channel("ledger-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "expenses" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_shares" },
        invalidate
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expense_events" },
        invalidate
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [queryClient]);
}
