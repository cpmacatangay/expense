import type { HistoryEntry, HistoryFilters } from "./types";

export function filterHistory(
  entries: HistoryEntry[],
  filters: HistoryFilters
): HistoryEntry[] {
  return entries.filter((entry) => {
    if (filters.from && entry.date < filters.from) return false;
    if (filters.to && entry.date > filters.to) return false;
    if (filters.adultId && !entry.presentAdultIds.includes(filters.adultId)) return false;
    if (filters.studentId && !entry.presentStudentIds.includes(filters.studentId)) {
      return false;
    }
    return true;
  });
}
