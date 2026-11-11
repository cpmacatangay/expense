import { db } from "@/data/cache/db";
import type { LocalDraft } from "./types";

export async function listLocalDrafts(groupId: string): Promise<LocalDraft[]> {
  const rows = await db.drafts.where("groupId").equals(groupId).toArray();
  return rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLocalDraft(id: string): Promise<LocalDraft | null> {
  return (await db.drafts.get(id)) ?? null;
}

export async function saveLocalDraft(draft: LocalDraft): Promise<void> {
  await db.drafts.put({ ...draft, updatedAt: new Date().toISOString() });
}

export async function deleteLocalDraft(id: string): Promise<void> {
  await db.drafts.delete(id);
}
