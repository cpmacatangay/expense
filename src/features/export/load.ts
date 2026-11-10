import { requireSupabase } from "@/data/supabase/client";
import { fetchAllRows } from "@/data/supabase/fetchAllRows";
import type { Group } from "@/features/groups/types";

export const SAFE_ADULT_COLUMNS =
  "id, group_id, profile_id, display_name, status, color, joined_at, created_at";

export type ExportProfile = {
  id: string;
  email: string;
  display_name: string;
};

export type GroupExport = {
  scope: "group";
  exported_at: string;
  group: Group;
  profiles: ExportProfile[];
  adults: Record<string, unknown>[];
  students: Record<string, unknown>[];
  outings: Record<string, unknown>[];
  outing_adults: Record<string, unknown>[];
  outing_students: Record<string, unknown>[];
  items: Record<string, unknown>[];
  shares: Record<string, unknown>[];
  settlements: Record<string, unknown>[];
  activity_events: Record<string, unknown>[];
};

export type MemberExport = {
  scope: "member";
  exported_at: string;
  group: Pick<Group, "id" | "name">;
  member: {
    profile: ExportProfile;
    adult: Record<string, unknown> | null;
  };
  outings: Record<string, unknown>[];
  shares: Record<string, unknown>[];
  settlements: Record<string, unknown>[];
  activity_events: Record<string, unknown>[];
};

export type ExportData = GroupExport | MemberExport;

export async function loadGroupExport(groupId: string): Promise<GroupExport> {
  const client = requireSupabase();

  const { data: group, error: groupError } = await client
    .from("groups")
    .select("id, name, owner_id, status, created_at")
    .eq("id", groupId)
    .single();
  if (groupError) throw groupError;

  const [adults, students, outings] = await Promise.all([
    fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from("group_adults")
        .select(SAFE_ADULT_COLUMNS)
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from("students")
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from("outings")
        .select("*")
        .eq("group_id", groupId)
        .order("date", { ascending: true })
        .order("created_at", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    })
  ]);

  const outingIds = outings
    .map((outing) => outing.id)
    .filter((id): id is string => typeof id === "string");

  const [outingAdults, outingStudents, items, shares, settlements, activity] =
    await Promise.all([
      outingIds.length === 0
        ? []
        : fetchAllRows(async (from, to) => {
            const { data, error } = await client
              .from("outing_adults")
              .select("*")
              .in("outing_id", outingIds)
              .range(from, to);
            if (error) throw error;
            return (data ?? []) as Record<string, unknown>[];
          }),
      outingIds.length === 0
        ? []
        : fetchAllRows(async (from, to) => {
            const { data, error } = await client
              .from("outing_students")
              .select("*")
              .in("outing_id", outingIds)
              .range(from, to);
            if (error) throw error;
            return (data ?? []) as Record<string, unknown>[];
          }),
      outingIds.length === 0
        ? []
        : fetchAllRows(async (from, to) => {
            const { data, error } = await client
              .from("items")
              .select("*")
              .in("outing_id", outingIds)
              .order("created_at", { ascending: true })
              .range(from, to);
            if (error) throw error;
            return (data ?? []) as Record<string, unknown>[];
          }),
      outingIds.length === 0
        ? []
        : fetchAllRows(async (from, to) => {
            const { data, error } = await client
              .from("shares")
              .select("*")
              .in("outing_id", outingIds)
              .order("created_at", { ascending: true })
              .range(from, to);
            if (error) throw error;
            return (data ?? []) as Record<string, unknown>[];
          }),
      fetchAllRows(async (from, to) => {
        const { data, error } = await client
          .from("settlements")
          .select("*")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return (data ?? []) as Record<string, unknown>[];
      }),
      fetchAllRows(async (from, to) => {
        const { data, error } = await client
          .from("activity_events")
          .select("*")
          .eq("group_id", groupId)
          .order("created_at", { ascending: true })
          .order("id", { ascending: true })
          .range(from, to);
        if (error) throw error;
        return (data ?? []) as Record<string, unknown>[];
      })
    ]);

  const profileIds = adults
    .map((adult) => adult.profile_id)
    .filter((id): id is string => typeof id === "string");

  const profiles =
    profileIds.length === 0
      ? []
      : await fetchAllRows(async (from, to) => {
          const { data, error } = await client
            .from("profiles")
            .select("id, email, display_name")
            .in("id", profileIds)
            .order("created_at", { ascending: true })
            .range(from, to);
          if (error) throw error;
          return (data ?? []) as ExportProfile[];
        });

  return {
    scope: "group",
    exported_at: new Date().toISOString(),
    group: group as Group,
    profiles,
    adults,
    students,
    outings,
    outing_adults: outingAdults,
    outing_students: outingStudents,
    items,
    shares,
    settlements,
    activity_events: activity
  };
}

export async function loadMemberExport(
  groupId: string,
  profileId: string
): Promise<MemberExport> {
  const client = requireSupabase();

  const [{ data: group, error: groupError }, { data: adult, error: adultError }] =
    await Promise.all([
      client.from("groups").select("id, name").eq("id", groupId).single(),
      client
        .from("group_adults")
        .select(SAFE_ADULT_COLUMNS)
        .eq("group_id", groupId)
        .eq("profile_id", profileId)
        .maybeSingle()
    ]);

  if (groupError) throw groupError;
  if (adultError) throw adultError;
  if (!adult) throw new Error("You are not an active adult in this group");

  const adultId = adult.id as string;
  const adultRow = adult as Record<string, unknown>;

  const shares = await fetchAllRows(async (from, to) => {
    const { data, error } = await client
      .from("shares")
      .select("*")
      .eq("adult_id", adultId)
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as Record<string, unknown>[];
  });

  const outingIds = [
    ...new Set(
      shares
        .map((share) => share.outing_id)
        .filter((id): id is string => typeof id === "string")
    )
  ];

  const [outings, settlements, activity] = await Promise.all([
    outingIds.length === 0
      ? []
      : fetchAllRows(async (from, to) => {
          const { data, error } = await client
            .from("outings")
            .select("*")
            .in("id", outingIds)
            .order("date", { ascending: true })
            .range(from, to);
          if (error) throw error;
          return (data ?? []) as Record<string, unknown>[];
        }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from("settlements")
        .select("*")
        .eq("group_id", groupId)
        .or(`from_adult_id.eq.${adultId},to_adult_id.eq.${adultId}`)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from("activity_events")
        .select("*")
        .eq("group_id", groupId)
        .eq("actor_profile_id", profileId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Record<string, unknown>[];
    })
  ]);

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", profileId)
    .single();
  if (profileError) throw profileError;

  return {
    scope: "member",
    exported_at: new Date().toISOString(),
    group: group as Pick<Group, "id" | "name">,
    member: {
      profile: profile as ExportProfile,
      adult: adultRow
    },
    outings,
    shares,
    settlements,
    activity_events: activity
  };
}
