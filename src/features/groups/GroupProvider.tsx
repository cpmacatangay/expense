import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { requireSupabase } from "@/data/supabase/client";
import { useAuth } from "@/features/auth/authContext";
import { GroupContext, type GroupContextValue } from "./groupContext";
import { getErrorMessage } from "@/lib/errors";
import type { Adult, Group, Invitation, Profile, Student } from "./types";

type MembershipRow = {
  group_id: string;
  groups: Group | Group[] | null;
};

function selectedGroupKey(userId: string) {
  return `salo.selected-group.${userId}`;
}

function readSelectedGroup(userId: string) {
  try {
    return localStorage.getItem(selectedGroupKey(userId));
  } catch {
    return null;
  }
}

function writeSelectedGroup(userId: string, groupId: string | null) {
  try {
    if (groupId) localStorage.setItem(selectedGroupKey(userId), groupId);
    else localStorage.removeItem(selectedGroupKey(userId));
  } catch {
    // A blocked storage should not stop the app.
  }
}

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [adults, setAdults] = useState<Adult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = false) => {
      if (!user) {
        setProfile(null);
        setGroups([]);
        setGroup(null);
        setAdults([]);
        setStudents([]);
        setLoading(false);
        return;
      }

      if (showLoading) setLoading(true);
      setError(null);

      try {
        const client = requireSupabase();
        const { data: profileData, error: profileError } = await client.rpc("ensure_profile");
        if (profileError) throw profileError;
        const nextProfile = profileData as Profile;

        const { data: membershipRows, error: membershipError } = await client
          .from("group_adults")
          .select("group_id, groups!inner(id, name, owner_id, status)")
          .eq("profile_id", user.id)
          .eq("status", "active")
          .eq("groups.status", "active")
          .order("created_at", { ascending: true });

        if (membershipError) throw membershipError;

        const nextGroups: Group[] = [];
        for (const row of (membershipRows ?? []) as MembershipRow[]) {
          const candidate = Array.isArray(row.groups) ? row.groups[0] : row.groups;
          if (candidate && !nextGroups.some((entry) => entry.id === candidate.id)) {
            nextGroups.push(candidate);
          }
        }

        const stored = readSelectedGroup(user.id);
        const nextGroup =
          nextGroups.find((entry) => entry.id === stored) ?? nextGroups[0] ?? null;

        let nextAdults: Adult[] = [];
        let nextStudents: Student[] = [];

        if (nextGroup) {
          const [{ data: adultRows, error: adultError }, { data: studentRows, error: studentError }] =
            await Promise.all([
              client
                .from("group_adults")
                .select(
                  "id, profile_id, display_name, status, color, payment_qr_path, payment_qr_label"
                )
                .eq("group_id", nextGroup.id)
                .order("created_at", { ascending: true }),
              client
                .from("students")
                .select("id, name, status")
                .eq("group_id", nextGroup.id)
                .eq("status", "active")
                .order("created_at", { ascending: true })
            ]);

          if (adultError) throw adultError;
          if (studentError) throw studentError;
          nextAdults = (adultRows ?? []) as Adult[];
          nextStudents = (studentRows ?? []) as Student[];
        }

        if (nextGroup) writeSelectedGroup(user.id, nextGroup.id);
        else writeSelectedGroup(user.id, null);

        setProfile(nextProfile);
        setGroups(nextGroups);
        setGroup(nextGroup);
        setAdults(nextAdults);
        setStudents(nextStudents);
      } catch (caught) {
        setError(getErrorMessage(caught, "Could not load your tables"));
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const selectGroup = useCallback(
    async (groupId: string) => {
      if (!user) return;
      writeSelectedGroup(user.id, groupId);
      await load(false);
    },
    [load, user]
  );

  const createGroup = useCallback(
    async (name: string) => {
      if (!user) throw new Error("Not signed in");
      const client = requireSupabase();
      const { data, error: rpcError } = await client.rpc("create_group", { group_name: name });
      if (rpcError) throw rpcError;
      if (typeof data === "string") {
        writeSelectedGroup(user.id, data);
      }
      await load(false);
    },
    [load, user]
  );

  const joinGroup = useCallback(
    async (code: string) => {
      if (!user) throw new Error("Not signed in");
      const client = requireSupabase();
      const { data, error: rpcError } = await client.rpc("join_group_with_code", {
        invite_code: code
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error("Invitation not found or expired");
      if (typeof data === "string") {
        writeSelectedGroup(user.id, data);
      }
      await load(false);
    },
    [load, user]
  );

  const inviteAdult = useCallback(
    async (name: string, email: string) => {
      const client = requireSupabase();
      const { data, error } = await client.functions.invoke("invite-adult", {
        body: { name, email }
      });
      if (error) throw error;
      await load();
      return data as Invitation;
    },
    [load]
  );

  const createStudent = useCallback(
    async (name: string) => {
      if (!group) throw new Error("No group selected");
      const client = requireSupabase();
      const { error: insertError } = await client
        .from("students")
        .insert({ group_id: group.id, name: name.trim() });
      if (insertError) throw insertError;
      await load();
    },
    [group, load]
  );

  const value = useMemo<GroupContextValue>(
    () => ({
      profile,
      group,
      groups,
      adults,
      students,
      loading,
      error,
      selectGroup,
      createGroup,
      joinGroup,
      inviteAdult,
      createStudent,
      refresh: load
    }),
    [
      profile,
      group,
      groups,
      adults,
      students,
      loading,
      error,
      selectGroup,
      createGroup,
      joinGroup,
      inviteAdult,
      createStudent,
      load
    ]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}
