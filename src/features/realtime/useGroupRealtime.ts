import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { requireSupabase } from "@/data/supabase/client";

type InvalidationKey = readonly unknown[];

export function useGroupRealtime(
  groupId: string | undefined,
  refresh: () => Promise<void>
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!groupId) return;

    const client = requireSupabase();
    const channel = client.channel(`group-live-${groupId}`);

    const invalidate = (keys: InvalidationKey[]) => {
      for (const key of keys) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    };

    const dataKeys: InvalidationKey[] = [
      ["outings", groupId],
      ["outing"],
      ["ledger", groupId],
      ["history", groupId],
      ["activity", groupId],
      ["settlements", groupId]
    ];

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "outings",
          filter: `group_id=eq.${groupId}`
        },
        () => invalidate(dataKeys)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "items" },
        () => invalidate(dataKeys)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shares" },
        () => invalidate(dataKeys)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outing_adults" },
        () => invalidate(dataKeys)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outing_students" },
        () => invalidate(dataKeys)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlements",
          filter: `group_id=eq.${groupId}`
        },
        () => invalidate(dataKeys)
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_events",
          filter: `group_id=eq.${groupId}`
        },
        () =>
          invalidate([
            ["activity", groupId],
            ["ledger", groupId],
            ["settlements", groupId],
            ["history", groupId]
          ])
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "group_adults",
          filter: `group_id=eq.${groupId}`
        },
        () => {
          invalidate([
            ["activity", groupId],
            ["ledger", groupId],
            ["history", groupId]
          ]);
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "students",
          filter: `group_id=eq.${groupId}`
        },
        () => {
          invalidate([
            ["activity", groupId],
            ["history", groupId]
          ]);
          void refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invitations",
          filter: `group_id=eq.${groupId}`
        },
        () => invalidate([["activity", groupId]])
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "groups",
          filter: `id=eq.${groupId}`
        },
        () => {
          invalidate(dataKeys);
          void refresh();
        }
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [groupId, queryClient, refresh]);
}
