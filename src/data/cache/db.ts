import Dexie, { type Table } from "dexie";
import type { LocalDraft } from "@/features/drafts/types";

export type CacheRow = {
  key: string;
  value: string;
};

class SaloDatabase extends Dexie {
  cache!: Table<CacheRow, string>;
  drafts!: Table<LocalDraft, string>;

  constructor() {
    super("salo");
    this.version(1).stores({
      cache: "key",
      drafts: "id, groupId, updatedAt"
    });
  }
}

export const db = new SaloDatabase();
