import { rpc } from "@/data/supabase/rpc";
import type { ActivityEvent } from "./types";

export async function recentActivity(limit = 5): Promise<ActivityEvent[]> {
  const data = await rpc<{ events: ActivityEvent[] }>("recent_activity", {
    p_limit: limit
  });
  return data.events ?? [];
}
