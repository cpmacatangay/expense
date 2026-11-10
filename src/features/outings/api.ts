import { requireSupabase } from "@/data/supabase/client";
import type {
  NewItemInput,
  Outing,
  OutingAdult,
  OutingDetail,
  OutingItem,
  OutingShare,
  OutingStudent
} from "./types";

export async function listOutings(groupId: string): Promise<Outing[]> {
  const { data, error } = await requireSupabase()
    .from("outings")
    .select("*")
    .eq("group_id", groupId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Outing[];
}

export async function createOuting(input: {
  groupId: string;
  authorProfileId: string;
  date: string;
  place?: string;
  presentAdultIds: string[];
  presentStudents?: { studentId: string; coveringAdultId: string }[];
}): Promise<Outing> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("outings")
    .insert({
      group_id: input.groupId,
      author_profile_id: input.authorProfileId,
      date: input.date,
      place: input.place ?? null,
      status: "draft",
      total_mode: "auto"
    })
    .select()
    .single();
  if (error) throw error;

  const outing = data as Outing;

  if (input.presentAdultIds.length > 0) {
    const { error: adultError } = await client.from("outing_adults").insert(
      input.presentAdultIds.map((adultId) => ({
        outing_id: outing.id,
        adult_id: adultId,
        present: true
      }))
    );
    if (adultError) throw adultError;
  }

  if (input.presentStudents?.length) {
    const { error: studentError } = await client.from("outing_students").insert(
      input.presentStudents.map((student) => ({
        outing_id: outing.id,
        student_id: student.studentId,
        present: true,
        covering_adult_id: student.coveringAdultId
      }))
    );
    if (studentError) throw studentError;
  }

  return outing;
}

export async function getOuting(id: string): Promise<OutingDetail> {
  const client = requireSupabase();
  const [
    { data: outing, error: outingError },
    { data: adults },
    { data: students },
    { data: items },
    { data: shares }
  ] = await Promise.all([
    client.from("outings").select("*").eq("id", id).single(),
    client.from("outing_adults").select("*").eq("outing_id", id),
    client.from("outing_students").select("*").eq("outing_id", id),
    client.from("items").select("*").eq("outing_id", id).order("sort_order", { ascending: true }),
    client.from("shares").select("*").eq("outing_id", id)
  ]);

  if (outingError) throw outingError;

  return {
    outing: outing as Outing,
    adults: (adults ?? []) as OutingAdult[],
    students: (students ?? []) as OutingStudent[],
    items: (items ?? []) as OutingItem[],
    shares: (shares ?? []) as OutingShare[]
  };
}

export async function updateOuting(
  id: string,
  version: number,
  patch: Partial<Pick<Outing, "date" | "place" | "notes" | "payer_adult_id" | "total_mode">>
): Promise<Outing> {
  const { data, error } = await requireSupabase()
    .from("outings")
    .update({ ...patch, version: version + 1 })
    .eq("id", id)
    .eq("version", version)
    .select()
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error("This outing changed on another device. Reload before saving.");
  }
  return data as Outing;
}

export async function setAdultPresent(outingId: string, adultId: string, present: boolean) {
  const client = requireSupabase();
  if (present) {
    const { error } = await client
      .from("outing_adults")
      .upsert({ outing_id: outingId, adult_id: adultId, present: true });
    if (error) throw error;
  } else {
    const { error } = await client
      .from("outing_adults")
      .delete()
      .eq("outing_id", outingId)
      .eq("adult_id", adultId);
    if (error) throw error;
  }
}

export async function setStudentPresent(
  outingId: string,
  studentId: string,
  present: boolean,
  coveringAdultId: string | null
) {
  const client = requireSupabase();
  if (present) {
    if (!coveringAdultId) throw new Error("Choose the adult covering this student");
    const { error } = await client.from("outing_students").upsert({
      outing_id: outingId,
      student_id: studentId,
      present: true,
      covering_adult_id: coveringAdultId
    });
    if (error) throw error;
  } else {
    const { error } = await client
      .from("outing_students")
      .delete()
      .eq("outing_id", outingId)
      .eq("student_id", studentId);
    if (error) throw error;
  }
}

export async function addItem(input: NewItemInput): Promise<OutingItem> {
  const { data, error } = await requireSupabase()
    .from("items")
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as OutingItem;
}

export async function deleteItem(id: string) {
  const { error } = await requireSupabase().from("items").delete().eq("id", id);
  if (error) throw error;
}

export type FinalizeResult = {
  totalCentavos: number;
  shares: {
    adultId: string;
    totalCentavos: number;
  }[];
};

export async function reopenOuting(outingId: string, expectedVersion: number): Promise<Outing> {
  const { data, error } = await requireSupabase().rpc("reopen_outing", {
    p_outing_id: outingId,
    p_expected_version: expectedVersion
  });

  if (error) throw error;
  return data as Outing;
}

export async function finalizeOuting(
  outingId: string,
  expectedVersion: number
): Promise<FinalizeResult> {
  const { data, error } = await requireSupabase().functions.invoke("finalize-outing", {
    body: { outingId, expectedVersion }
  });

  if (error) {
    let message = error.message;
    const response = (error as { context?: Response }).context;
    if (response) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (payload?.error) message = payload.error;
    }
    throw new Error(message);
  }

  return data as FinalizeResult;
}

export function todayInManila(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}
