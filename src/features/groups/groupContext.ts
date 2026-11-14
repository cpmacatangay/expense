import { createContext, useContext } from "react";
import type { Adult, Group, Invitation, Profile, Student } from "./types";

export type GroupContextValue = {
  profile: Profile | null;
  group: Group | null;
  adults: Adult[];
  students: Student[];
  loading: boolean;
  error: string | null;
  createGroup: (name: string) => Promise<void>;
  joinGroup: (code: string) => Promise<void>;
  inviteAdult: (name: string, email: string) => Promise<Invitation>;
  createStudent: (name: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export const GroupContext = createContext<GroupContextValue | null>(null);

export function useGroup(): GroupContextValue {
  const value = useContext(GroupContext);
  if (!value) throw new Error("useGroup must be used inside GroupProvider");
  return value;
}
