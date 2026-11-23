export type PersonStatus = "pending" | "active" | "former";

export type Person = {
  id: string;
  displayName: string;
  status: PersonStatus;
  isSelf: boolean;
  hasQr: boolean;
  createdByMe: boolean;
  pendingEmail: string | null;
  invitationExpiresAt: string | null;
};

export type AddPersonResult = {
  personId: string;
  status: "active" | "pending";
  inviteToken: string | null;
  expiresAt: string | null;
};

export type InviteLinkResult = {
  personId: string;
  inviteToken: string;
  expiresAt: string;
};
