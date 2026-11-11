import { db } from "./db";
import type { Adult, Group, Profile, Student } from "@/features/groups/types";

export type GroupSnapshot = {
  profile: Profile;
  group: Group;
  adults: Adult[];
  students: Student[];
  savedAt: string;
};

const SNAPSHOT_KEY = "group-snapshot";

export async function saveGroupSnapshot(snapshot: {
  profile: Profile;
  group: Group;
  adults: Adult[];
  students: Student[];
}): Promise<void> {
  try {
    const value: GroupSnapshot = {
      ...snapshot,
      savedAt: new Date().toISOString()
    };
    await db.cache.put({ key: SNAPSHOT_KEY, value: JSON.stringify(value) });
  } catch {
    // Offline caching is best-effort.
  }
}

export async function loadGroupSnapshot(): Promise<GroupSnapshot | null> {
  try {
    const row = await db.cache.get(SNAPSHOT_KEY);
    if (!row) return null;
    const parsed = JSON.parse(row.value) as GroupSnapshot;
    if (!parsed.group || !parsed.profile) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearGroupSnapshot(): Promise<void> {
  try {
    await db.cache.delete(SNAPSHOT_KEY);
  } catch {
    // Ignore storage failures.
  }
}
