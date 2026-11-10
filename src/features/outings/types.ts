export type OutingStatus = "private_draft" | "draft" | "finalized" | "reopened";
export type TotalMode = "auto" | "manual" | "fixed";
export type AssignmentType = "adult" | "student" | "shared";

export type Outing = {
  id: string;
  group_id: string;
  author_profile_id: string;
  date: string;
  place: string | null;
  notes: string | null;
  payer_adult_id: string | null;
  status: OutingStatus;
  total_mode: TotalMode;
  total_centavos: number;
  version: number;
  finalized_at: string | null;
  reopened_at: string | null;
  created_at: string;
  updated_at: string;
};

export type OutingAdult = {
  outing_id: string;
  adult_id: string;
  present: boolean;
};

export type OutingStudent = {
  outing_id: string;
  student_id: string;
  present: boolean;
  covering_adult_id: string | null;
};

export type OutingItem = {
  id: string;
  outing_id: string;
  name: string;
  quantity: number;
  unit_amount_centavos: number;
  amount_centavos: number;
  assignment_type: AssignmentType;
  assigned_adult_id: string | null;
  assigned_student_id: string | null;
  sort_order: number;
};

export type OutingDetail = {
  outing: Outing;
  adults: OutingAdult[];
  students: OutingStudent[];
  items: OutingItem[];
};

export type NewItemInput = {
  outing_id: string;
  name: string;
  quantity: number;
  unit_amount_centavos: number;
  assignment_type: AssignmentType;
  assigned_adult_id?: string | null;
  assigned_student_id?: string | null;
  sort_order?: number;
};
