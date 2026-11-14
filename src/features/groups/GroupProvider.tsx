import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  clearGroupSnapshot,
  loadGroupSnapshot,
  saveGroupSnapshot
} from "@/data/cache/groupSnapshot";
import { requireSupabase } from "@/data/supabase/client";
import { useAuth } from "@/features/auth/authContext";
import { GroupContext, type GroupContextValue } from "./groupContext";
import { getErrorMessage } from "@/lib/errors";
import type { Adult, Group, Invitation, Profile, Student } from "./types";

export function GroupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [adults, setAdults] = useState<Adult[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (showLoading = false) => {
      if (!user) {
        setProfile(null);
        setGroup(null);
        setAdults([]);
        setStudents([]);
        setLoading(false);
        void clearGroupSnapshot();
        return;
      }

      if (showLoading) setLoading(true);
      setError(null);

      try {
        const client = requireSupabase();
        const { data: profileData, error: profileError } = await client.rpc("ensure_profile");
        if (profileError) throw profileError;
        const nextProfile = profileData as Profile;

        const { data: membership, error: membershipError } = await client
          .from("group_adults")
          .select("group_id, groups!inner(id, name, owner_id, status)")
          .eq("profile_id", user.id)
          .eq("status", "active")
          .eq("groups.status", "active")
          .limit(1)
          .maybeSingle();

        if (membershipError) throw membershipError;

        const nextGroup = membership ? (membership.groups as unknown as Group) : null;

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

        setProfile(nextProfile);
        setGroup(nextGroup);
        setAdults(nextAdults);
        setStudents(nextStudents);

        if (nextGroup) {
          await saveGroupSnapshot({
            profile: nextProfile,
            group: nextGroup,
            adults: nextAdults,
            students: nextStudents
          });
        } else {
          await clearGroupSnapshot();
        }
      } catch (caught) {
        const message = getErrorMessage(caught, "Could not load your group");
        const networkFailure =
          (typeof navigator !== "undefined" && !navigator.onLine) ||
          /fetch|network|load failed|timeout/i.test(message);

        if (networkFailure) {
          const snapshot = await loadGroupSnapshot();
          if (snapshot && snapshot.profile.id === user.id) {
            setProfile(snapshot.profile);
            setGroup(snapshot.group);
            setAdults(snapshot.adults);
            setStudents(snapshot.students);
            setError(null);
            return;
          }
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const createGroup = useCallback(
    async (name: string) => {
      const client = requireSupabase();
      const { error: rpcError } = await client.rpc("create_group", { group_name: name });
      if (rpcError) throw rpcError;
      await load();
    },
    [load]
  );

  const joinGroup = useCallback(
    async (code: string) => {
      const client = requireSupabase();
      const { data, error: rpcError } = await client.rpc("join_group_with_code", {
        invite_code: code
      });
      if (rpcError) throw rpcError;
      if (!data) throw new Error("Invitation not found or expired");
      await load();
    },
    [load]
  );

  const inviteAdult = useCallback(
    async (name: string, email: string) => {
      const client = requireSupabase();
      const { data, error: rpcError } = await client.rpc("create_invitation", {
        adult_display_name: name,
        invitee_email: email
      });
      if (rpcError) throw rpcError;
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
      adults,
      students,
      loading,
      error,
      createGroup,
      joinGroup,
      inviteAdult,
      createStudent,
      refresh: load
    }),
    [
      profile,
      group,
      adults,
      students,
      loading,
      error,
      createGroup,
      joinGroup,
      inviteAdult,
      createStudent,
      load
    ]
  );

  return <GroupContext.Provider value={value}>{children}</GroupContext.Provider>;
}
