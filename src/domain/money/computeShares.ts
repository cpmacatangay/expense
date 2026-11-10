import { largestRemainder } from "./allocate";
import { assertCentavos, MoneyValidationError } from "./validate";
import type { AdultShare, ComputeSharesInput, PresentStudent, SharesResult } from "./types";

type Head =
  | { kind: "adult"; adultId: string }
  | { kind: "student"; student: PresentStudent };

export function computeShares(input: ComputeSharesInput): SharesResult {
  const { presentAdults, presentStudents, items, totalMode } = input;

  if (presentAdults.length === 0) {
    throw new MoneyValidationError("At least one present adult is required");
  }

  const adultIds = new Set(presentAdults);
  if (adultIds.size !== presentAdults.length) {
    throw new MoneyValidationError("Present adults must be unique");
  }

  const studentsById = new Map<string, PresentStudent>();
  for (const student of presentStudents) {
    if (studentsById.has(student.id)) {
      throw new MoneyValidationError("Present students must be unique");
    }
    if (!adultIds.has(student.coveredByAdultId)) {
      throw new MoneyValidationError("Every present student must be covered by a present adult");
    }
    studentsById.set(student.id, student);
  }

  const ownItems = new Map<string, number>(presentAdults.map((id) => [id, 0]));
  const studentItems = new Map<string, number>(presentAdults.map((id) => [id, 0]));
  const sharedHeads = new Map<string, number>(presentAdults.map((id) => [id, 0]));
  const coveredStudentShared = new Map<string, number>(presentAdults.map((id) => [id, 0]));

  let itemSumCentavos = 0;
  let sharedItemsCentavos = 0;

  for (const item of items) {
    assertCentavos(item.amountCentavos, "Item amount");
    itemSumCentavos += item.amountCentavos;

    if (item.assignmentType === "adult") {
      if (!item.assignedAdultId || !adultIds.has(item.assignedAdultId)) {
        throw new MoneyValidationError("An adult item must be assigned to a present adult");
      }
      if (item.assignedStudentId) {
        throw new MoneyValidationError("An adult item cannot also assign a student");
      }
      ownItems.set(
        item.assignedAdultId,
        (ownItems.get(item.assignedAdultId) ?? 0) + item.amountCentavos
      );
      continue;
    }

    if (item.assignmentType === "student") {
      if (!item.assignedStudentId) {
        throw new MoneyValidationError("A student item must be assigned to a present student");
      }
      if (item.assignedAdultId) {
        throw new MoneyValidationError("A student item cannot also assign an adult");
      }
      const student = studentsById.get(item.assignedStudentId);
      if (!student) {
        throw new MoneyValidationError("A student item must be assigned to a present student");
      }
      studentItems.set(
        student.coveredByAdultId,
        (studentItems.get(student.coveredByAdultId) ?? 0) + item.amountCentavos
      );
      continue;
    }

    if (item.assignmentType === "shared") {
      if (item.assignedAdultId || item.assignedStudentId) {
        throw new MoneyValidationError("A shared item cannot have an individual assignment");
      }
      sharedItemsCentavos += item.amountCentavos;
      continue;
    }

    throw new MoneyValidationError("Unknown item assignment type");
  }

  const heads: Head[] = [
    ...presentAdults.map((adultId) => ({ kind: "adult" as const, adultId })),
    ...presentStudents.map((student) => ({ kind: "student" as const, student }))
  ];

  if (sharedItemsCentavos > 0) {
    const sharedAmounts = largestRemainder(
      sharedItemsCentavos,
      heads.map(() => 1)
    );

    heads.forEach((head, index) => {
      if (head.kind === "adult") {
        sharedHeads.set(head.adultId, (sharedHeads.get(head.adultId) ?? 0) + sharedAmounts[index]);
      } else {
        coveredStudentShared.set(
          head.student.coveredByAdultId,
          (coveredStudentShared.get(head.student.coveredByAdultId) ?? 0) + sharedAmounts[index]
        );
      }
    });
  }

  const baseTotals = presentAdults.map(
    (adultId) =>
      (ownItems.get(adultId) ?? 0) +
      (studentItems.get(adultId) ?? 0) +
      (sharedHeads.get(adultId) ?? 0) +
      (coveredStudentShared.get(adultId) ?? 0)
  );

  let totalCentavos: number;
  if (totalMode === "auto") {
    totalCentavos = itemSumCentavos;
  } else if (totalMode === "manual") {
    assertCentavos(input.manualTotalCentavos, "Manual total");
    totalCentavos = input.manualTotalCentavos as number;
  } else if (totalMode === "fixed") {
    assertCentavos(input.fixedTotalCentavos, "Fixed total");
    totalCentavos = input.fixedTotalCentavos as number;
  } else {
    throw new MoneyValidationError("Unknown total mode");
  }

  const finalTotals =
    totalMode === "auto" ? baseTotals : largestRemainder(totalCentavos, baseTotals);

  const shares: AdultShare[] = presentAdults.map((adultId, index) => {
    const ownItemsCentavos = ownItems.get(adultId) ?? 0;
    const studentItemsCentavos = studentItems.get(adultId) ?? 0;
    const sharedHeadCentavos = sharedHeads.get(adultId) ?? 0;
    const coveredStudentSharedCentavos = coveredStudentShared.get(adultId) ?? 0;

    return {
      adultId,
      ownItemsCentavos,
      studentItemsCentavos,
      sharedHeadCentavos,
      coveredStudentSharedCentavos,
      totalDifferenceCentavos: finalTotals[index] - baseTotals[index],
      totalCentavos: finalTotals[index]
    };
  });

  const shareSum = shares.reduce((sum, share) => sum + share.totalCentavos, 0);
  if (shareSum !== totalCentavos) {
    throw new Error("Share allocation did not sum to the outing total");
  }

  return {
    totalCentavos,
    itemSumCentavos,
    shares
  };
}
