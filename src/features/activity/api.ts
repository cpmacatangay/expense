import { requireSupabase } from "@/data/supabase/client";
import type { ActivityEvent, ActivityFilter, ActivityPageResult } from "./types";

const PAGE_SIZE = 20;

const filterTypes: Record<Exclude<ActivityFilter, "all">, string[]> = {
  settlements: ["settlement"],
  outings: ["outing", "item"],
  members: ["group", "adult", "invitation", "student"]
};

export async function listActivity(
  groupId: string,
  options: { before?: string | null; filter?: ActivityFilter } = {}
): Promise<ActivityPageResult> {
  const filter = options.filter ?? "all";

  let query = requireSupabase()
    .from("activity_events")
    .select(
      "id, group_id, actor_profile_id, action, entity_type, entity_id, before_json, after_json, created_at, actor:profiles(id, display_name, nickname)"
    )
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (options.before) {
    query = query.lt("created_at", options.before);
  }

  if (filter !== "all") {
    query = query.in("entity_type", filterTypes[filter]);
  }

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as unknown as ActivityEvent[]).map((row) => ({
    ...row,
    actor: Array.isArray(row.actor) ? (row.actor[0] ?? null) : row.actor
  }));

  const hasMore = rows.length > PAGE_SIZE;
  const events = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

  return {
    events,
    nextCursor: hasMore ? (events[events.length - 1]?.created_at ?? null) : null
  };
}
