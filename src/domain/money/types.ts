export type Centavos = number;

export type TotalMode = "auto" | "manual" | "fixed";

export type AssignmentType = "adult" | "student" | "shared";

export type PresentStudent = {
  id: string;
  coveredByAdultId: string;
};

export type MoneyItem = {
  id?: string;
  amountCentavos: Centavos;
  assignmentType: AssignmentType;
  assignedAdultId?: string | null;
  assignedStudentId?: string | null;
};

export type ComputeSharesInput = {
  presentAdults: string[];
  presentStudents: PresentStudent[];
  items: MoneyItem[];
  totalMode: TotalMode;
  manualTotalCentavos?: Centavos | null;
  fixedTotalCentavos?: Centavos | null;
};

export type AdultShare = {
  adultId: string;
  ownItemsCentavos: Centavos;
  studentItemsCentavos: Centavos;
  sharedHeadCentavos: Centavos;
  coveredStudentSharedCentavos: Centavos;
  totalDifferenceCentavos: Centavos;
  totalCentavos: Centavos;
};

export type SharesResult = {
  totalCentavos: Centavos;
  itemSumCentavos: Centavos;
  shares: AdultShare[];
};
