import { rpc } from "@/data/supabase/rpc";

export type Me = {
  id: string;
  email: string;
  displayName: string;
  status: "pending" | "active" | "former";
  paymentQrLabel: string | null;
  paymentQrPath: string | null;
  hasQr: boolean;
};

type PersonResponse = { person: Me };

export async function ensurePerson(): Promise<Me> {
  const data = await rpc<PersonResponse>("ensure_person");
  return data.person;
}

export async function claimPeopleForMe(): Promise<string[]> {
  const data = await rpc<{ claimedPersonIds: string[] }>("claim_people_for_me");
  return data.claimedPersonIds ?? [];
}

export async function claimInvite(token: string): Promise<{ personId: string }> {
  return rpc<{ personId: string }>("claim_invite", { p_token: token });
}

export async function updateDisplayName(displayName: string): Promise<Me> {
  const data = await rpc<PersonResponse>("update_display_name", {
    p_display_name: displayName
  });
  return data.person;
}

export async function canDeleteAccount(): Promise<{
  canDelete: boolean;
  youOweCentavos: number;
  owedToYouCentavos: number;
}> {
  return rpc("can_delete_account");
}
