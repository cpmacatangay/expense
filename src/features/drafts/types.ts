export type DraftAssignment = "adult" | "student" | "shared";

export type LocalDraftItem = {
  id: string;
  name: string;
  quantity: number;
  unitAmountCentavos: number;
  assignmentType: DraftAssignment;
  assignedAdultId: string | null;
  assignedStudentId: string | null;
};

export type LocalDraftStudent = {
  studentId: string;
  coveringAdultId: string;
};

export type LocalDraft = {
  id: string;
  groupId: string;
  authorProfileId: string;
  date: string;
  place: string;
  notes: string;
  payerAdultId: string;
  presentAdultIds: string[];
  presentStudents: LocalDraftStudent[];
  items: LocalDraftItem[];
  createdAt: string;
  updatedAt: string;
};

export function createLocalDraft(input: {
  groupId: string;
  authorProfileId: string;
  date: string;
  presentAdultIds: string[];
}): LocalDraft {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    groupId: input.groupId,
    authorProfileId: input.authorProfileId,
    date: input.date,
    place: "",
    notes: "",
    payerAdultId: "",
    presentAdultIds: input.presentAdultIds,
    presentStudents: [],
    items: [],
    createdAt: now,
    updatedAt: now
  };
}
