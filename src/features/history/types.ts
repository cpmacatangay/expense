import type { OutingStatus } from "@/features/outings/types";

export type HistoryEntry = {
  id: string;
  date: string;
  place: string | null;
  status: OutingStatus;
  totalCentavos: number;
  payerAdultId: string | null;
  presentAdultIds: string[];
  presentStudentIds: string[];
};

export type HistoryFilters = {
  from: string;
  to: string;
  adultId: string;
  studentId: string;
};
