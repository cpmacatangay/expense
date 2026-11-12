import { db } from "@/data/cache/db";
import type { LocalDraft } from "./types";

export async function listLocalDrafts(
  groupId: string,
  authorProfileId: string
): Promise<LocalDraft[]> {
  const rows = await db.drafts
    .where("groupId")
    .equals(groupId)
    .and((draft) => draft.authorProfileId === authorProfileId)
    .toArray();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLocalDraft(
  id: string,
  authorProfileId: string
): Promise<LocalDraft | null> {
  const draft = (await db.drafts.get(id)) ?? null;
  if (!draft || draft.authorProfileId !== authorProfileId) return null;
  return draft;
}

export async function saveLocalDraft(draft: LocalDraft): Promise<void> {
  await db.drafts.put({ ...draft, updatedAt: new Date().toISOString() });
}

export async function deleteLocalDraft(id: string): Promise<void> {
  await db.drafts.delete(id);
}
