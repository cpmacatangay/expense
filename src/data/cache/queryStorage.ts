import { db } from "./db";

export const queryStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      const row = await db.cache.get(key);
      return row?.value ?? null;
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await db.cache.put({ key, value });
    } catch {
      // A full or unavailable IndexedDB must not break the app.
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await db.cache.delete(key);
    } catch {
      // Ignore storage failures.
    }
  }
};
