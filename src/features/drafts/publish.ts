import { requireSupabase } from "@/data/supabase/client";
import { deleteLocalDraft } from "./api";
import type { LocalDraft } from "./types";

export async function publishLocalDraft(
  draft: LocalDraft,
  status: "draft" | "private_draft"
): Promise<string> {
  const { data, error } = await requireSupabase().rpc("publish_local_draft", {
    p_client_id: draft.id,
    p_group_id: draft.groupId,
    p_author_profile_id: draft.authorProfileId,
    p_date: draft.date,
    p_place: draft.place,
    p_notes: draft.notes,
    p_payer_adult_id: draft.payerAdultId || null,
    p_adults: draft.presentAdultIds,
    p_students: draft.presentStudents.map((student) => ({
      studentId: student.studentId,
      coveringAdultId: student.coveringAdultId
    })),
    p_items: draft.items.map((item, index) => ({
      name: item.name,
      quantity: item.quantity,
      unitAmountCentavos: item.unitAmountCentavos,
      assignmentType: item.assignmentType,
      assignedAdultId: item.assignedAdultId,
      assignedStudentId: item.assignedStudentId,
      sortOrder: index
    })),
    p_status: status
  });

  if (error) throw error;

  await deleteLocalDraft(draft.id);
  return data as string;
}
