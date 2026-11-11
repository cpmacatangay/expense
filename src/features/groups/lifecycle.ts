import { requireSupabase } from "@/data/supabase/client";
import type { Adult, Group } from "./types";

export async function removeAdult(adultId: string): Promise<Adult> {
  const { data, error } = await requireSupabase().rpc("remove_group_adult", {
    p_adult_id: adultId
  });
  if (error) throw error;
  return data as Adult;
}

export async function restoreAdult(adultId: string): Promise<Adult> {
  const { data, error } = await requireSupabase().rpc("restore_group_adult", {
    p_adult_id: adultId
  });
  if (error) throw error;
  return data as Adult;
}

export async function transferOwnership(groupId: string, adultId: string): Promise<Group> {
  const { data, error } = await requireSupabase().rpc("transfer_group_ownership", {
    p_group_id: groupId,
    p_adult_id: adultId
  });
  if (error) throw error;
  return data as Group;
}

export async function archiveGroup(groupId: string): Promise<Group> {
  const { data, error } = await requireSupabase().rpc("archive_group", {
    p_group_id: groupId
  });
  if (error) throw error;
  return data as Group;
}

export async function softDeleteGroup(groupId: string): Promise<Group> {
  const { data, error } = await requireSupabase().rpc("soft_delete_group", {
    p_group_id: groupId
  });
  if (error) throw error;
  return data as Group;
}

export async function restoreGroup(groupId: string): Promise<Group> {
  const { data, error } = await requireSupabase().rpc("restore_group", {
    p_group_id: groupId
  });
  if (error) throw error;
  return data as Group;
}

export type InactiveGroup = {
  id: string;
  name: string;
  status: "archived" | "deleted";
  archived_at: string | null;
  deleted_at: string | null;
};

export async function listInactiveOwnedGroups(): Promise<InactiveGroup[]> {
  const { data, error } = await requireSupabase()
    .from("groups")
    .select("id, name, status, archived_at, deleted_at")
    .in("status", ["archived", "deleted"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as InactiveGroup[];
}
