import { requireSupabase } from "@/data/supabase/client";
import type { Invitation } from "./types";

export type OpenInvitation = {
  adult_id: string;
  expires_at: string;
  invitee_email: string | null;
};

export async function listOpenInvitations(groupId: string): Promise<OpenInvitation[]> {
  const { data, error } = await requireSupabase()
    .from("invitations")
    .select("adult_id, expires_at, invitee_email")
    .eq("group_id", groupId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as OpenInvitation[];
}

export async function invitePendingAdult(
  adultId: string,
  email?: string | null
): Promise<Invitation> {
  const { data, error } = await requireSupabase().rpc("invite_pending_adult", {
    p_adult_id: adultId,
    p_invitee_email: email ?? null
  });
  if (error) throw error;
  return data as Invitation;
}

export async function revokePendingInvite(adultId: string): Promise<number> {
  const { data, error } = await requireSupabase().rpc("revoke_pending_adult_invite", {
    p_adult_id: adultId
  });
  if (error) throw error;
  return data as number;
}
