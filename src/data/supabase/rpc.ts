import { requireSupabase } from "./client";

export async function rpc<T>(
  name: string,
  args?: Record<string, unknown>
): Promise<T> {
  const { data, error } = await requireSupabase().rpc(name, args);
  if (error) throw error;
  return data as T;
}
