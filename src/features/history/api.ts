import { requireSupabase } from "@/data/supabase/client";
import { fetchAllRows } from "@/data/supabase/fetchAllRows";
import type { Student } from "@/features/groups/types";
import type { HistoryEntry } from "./types";

type AttendanceRow = { outing_id: string; adult_id: string; present: boolean };
type StudentAttendanceRow = { outing_id: string; student_id: string; present: boolean };

export async function loadHistory(
  groupId: string
): Promise<{ entries: HistoryEntry[]; students: Student[] }> {
  const client = requireSupabase();

  const outings = await fetchAllRows(async (from, to) => {
    const { data, error } = await client
      .from("outings")
      .select("id, date, place, payer_adult_id, total_centavos")
      .eq("group_id", groupId)
      .eq("status", "finalized")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []) as {
      id: string;
      date: string;
      place: string | null;
      payer_adult_id: string | null;
      total_centavos: number;
    }[];
  });

  const outingIds = outings.map((outing) => outing.id);

  const [adults, students, allStudents] = await Promise.all([
    outingIds.length === 0
      ? []
      : fetchAllRows(async (from, to) => {
          const { data, error } = await client
            .from("outing_adults")
            .select("outing_id, adult_id, present")
            .in("outing_id", outingIds)
            .eq("present", true)
            .range(from, to);
          if (error) throw error;
          return (data ?? []) as AttendanceRow[];
        }),
    outingIds.length === 0
      ? []
      : fetchAllRows(async (from, to) => {
          const { data, error } = await client
            .from("outing_students")
            .select("outing_id, student_id, present")
            .in("outing_id", outingIds)
            .eq("present", true)
            .range(from, to);
          if (error) throw error;
          return (data ?? []) as StudentAttendanceRow[];
        }),
    fetchAllRows(async (from, to) => {
      const { data, error } = await client
        .from("students")
        .select("id, name, status")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as Student[];
    })
  ]);

  const adultsByOuting = new Map<string, string[]>();
  for (const row of adults) {
    const list = adultsByOuting.get(row.outing_id) ?? [];
    list.push(row.adult_id);
    adultsByOuting.set(row.outing_id, list);
  }

  const studentsByOuting = new Map<string, string[]>();
  for (const row of students) {
    const list = studentsByOuting.get(row.outing_id) ?? [];
    list.push(row.student_id);
    studentsByOuting.set(row.outing_id, list);
  }

  return {
    entries: outings.map((outing) => ({
      id: outing.id,
      date: outing.date,
      place: outing.place,
      totalCentavos: outing.total_centavos,
      payerAdultId: outing.payer_adult_id,
      presentAdultIds: adultsByOuting.get(outing.id) ?? [],
      presentStudentIds: studentsByOuting.get(outing.id) ?? []
    })),
    students: allStudents
  };
}
