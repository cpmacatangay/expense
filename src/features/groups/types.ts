export type Profile = {
  id: string;
  email: string;
  display_name: string;
  nickname: string | null;
};

export type Group = {
  id: string;
  name: string;
  owner_id: string;
  status: "active" | "archived" | "deleted";
};

export type Adult = {
  id: string;
  profile_id: string | null;
  display_name: string;
  status: "pending" | "active" | "removed";
  color: string;
  payment_qr_path: string | null;
  payment_qr_label: string | null;
};

export type Student = {
  id: string;
  name: string;
  status: "active" | "archived";
};

export type Invitation = {
  adult_id: string;
  code: string;
  token: string;
  expires_at: string;
  invitee_email?: string;
};
