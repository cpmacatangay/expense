import { rpc } from "@/data/supabase/rpc";
import type { AddPersonResult, InviteLinkResult, Person } from "./types";

export async function peopleForMe(): Promise<Person[]> {
  const data = await rpc<{ people: Person[] }>("people_for_me");
  return data.people ?? [];
}

export async function addPerson(email: string): Promise<AddPersonResult> {
  return rpc<AddPersonResult>("add_person", { p_email: email });
}

export async function createInviteLink(personId: string): Promise<InviteLinkResult> {
  return rpc<InviteLinkResult>("create_invite_link", { p_person_id: personId });
}

export async function correctPendingEmail(
  personId: string,
  email: string
): Promise<AddPersonResult | InviteLinkResult> {
  return rpc("correct_pending_email", {
    p_person_id: personId,
    p_email: email
  });
}

export function inviteUrl(token: string): string {
  return `${window.location.origin}/invite?token=${encodeURIComponent(token)}`;
}
