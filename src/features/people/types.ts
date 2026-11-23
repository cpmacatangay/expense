export type PersonStatus = "pending" | "active" | "former";

export type Person = {
  id: string;
  displayName: string;
  status: PersonStatus;
  isSelf: boolean;
  hasQr: boolean;
  createdByMe: boolean;
};

export type AddPersonResult = {
  personId: string;
  displayName: string;
  status: "active" | "pending";
};
