import { requireSupabase } from "@/data/supabase/client";
import type { Student } from "@/features/groups/types";

export type StudentRow = Student & {
  notes: string | null;
};

export async function listAllStudents(groupId: string): Promise<StudentRow[]> {
  const { data, error } = await requireSupabase()
    .from("students")
    .select("id, name, status, notes")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as StudentRow[];
}

export async function renameStudent(studentId: string, name: string): Promise<void> {
  const { error } = await requireSupabase()
    .from("students")
    .update({ name: name.trim() })
    .eq("id", studentId);

  if (error) throw error;
}

export async function setStudentStatus(
  studentId: string,
  status: "active" | "archived"
): Promise<void> {
  const { error } = await requireSupabase()
    .from("students")
    .update({ status })
    .eq("id", studentId);

  if (error) throw error;
}
