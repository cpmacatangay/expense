const CLEANUP_KEY = "salo.storage-cleanup.v1";

/**
 * Removes IndexedDB caches and persisted query data left by the offline-first
 * version. Runs once per browser profile.
 */
export function cleanupLegacyStorage() {
  if (typeof window === "undefined") return;

  try {
    if (localStorage.getItem(CLEANUP_KEY)) return;
    localStorage.setItem(CLEANUP_KEY, "1");
    localStorage.removeItem("salo-query-cache");
    if ("indexedDB" in window) {
      window.indexedDB.deleteDatabase("salo");
    }
  } catch {
    // A blocked storage should never stop the app from loading.
  }
}
