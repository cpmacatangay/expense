import { describe, expect, it } from "vitest";
import { computeShares } from "./computeShares";
import { MoneyValidationError } from "./validate";
import type { ComputeSharesInput, MoneyItem } from "./types";

const baseInput = (): ComputeSharesInput => ({
  presentAdults: ["A", "B"],
  presentStudents: [{ id: "S", coveredByAdultId: "A" }],
  items: [
    { amountCentavos: 1000, assignmentType: "adult", assignedAdultId: "A" },
    { amountCentavos: 2000, assignmentType: "adult", assignedAdultId: "B" },
    { amountCentavos: 500, assignmentType: "student", assignedStudentId: "S" },
    { amountCentavos: 300, assignmentType: "shared" }
  ],
  totalMode: "auto"
});

describe("computeShares", () => {
  it("charges adult, student, and shared items exactly", () => {
    const result = computeShares(baseInput());

    expect(result.totalCentavos).toBe(3800);
    expect(result.itemSumCentavos).toBe(3800);

    const a = result.shares.find((share) => share.adultId === "A");
    const b = result.shares.find((share) => share.adultId === "B");

    expect(a).toMatchObject({
      ownItemsCentavos: 1000,
      studentItemsCentavos: 500,
      sharedHeadCentavos: 100,
      coveredStudentSharedCentavos: 100,
      totalCentavos: 1700
    });
    expect(b).toMatchObject({
      ownItemsCentavos: 2000,
      studentItemsCentavos: 0,
      sharedHeadCentavos: 100,
      coveredStudentSharedCentavos: 0,
      totalCentavos: 2100
    });
    expect(result.shares.reduce((sum, share) => sum + share.totalCentavos, 0)).toBe(3800);
  });

  it("distributes a manual total proportionally and still sums exactly", () => {
    const result = computeShares({
      ...baseInput(),
      totalMode: "manual",
      manualTotalCentavos: 4000
    });

    expect(result.totalCentavos).toBe(4000);
    expect(result.shares.reduce((sum, share) => sum + share.totalCentavos, 0)).toBe(4000);
    expect(result.shares.every((share) => share.totalCentavos >= 0)).toBe(true);
  });

  it("keeps a fixed total when items change", () => {
    const result = computeShares({
      ...baseInput(),
      totalMode: "fixed",
      fixedTotalCentavos: 3000
    });

    expect(result.totalCentavos).toBe(3000);
    expect(result.shares.reduce((sum, share) => sum + share.totalCentavos, 0)).toBe(3000);
  });

  it("rejects an item assigned to an absent adult", () => {
    const input = baseInput();
    input.items = [
      { amountCentavos: 100, assignmentType: "adult", assignedAdultId: "X" }
    ];
    expect(() => computeShares(input)).toThrow(MoneyValidationError);
  });

  it("rejects an item assigned to an absent student", () => {
    const input = baseInput();
    input.items = [
      { amountCentavos: 100, assignmentType: "student", assignedStudentId: "X" }
    ];
    expect(() => computeShares(input)).toThrow(MoneyValidationError);
  });

  it("rejects a student without a present covering adult", () => {
    const input = baseInput();
    input.presentStudents = [{ id: "S", coveredByAdultId: "X" }];
    expect(() => computeShares(input)).toThrow(MoneyValidationError);
  });

  it("rejects a shared item with an individual assignment", () => {
    const input = baseInput();
    input.items = [
      { amountCentavos: 100, assignmentType: "shared", assignedAdultId: "A" }
    ];
    expect(() => computeShares(input)).toThrow(MoneyValidationError);
  });

  it("keeps every generated scenario exact and non-negative", () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)];

    for (let run = 0; run < 500; run += 1) {
      const adultCount = 1 + Math.floor(random() * 6);
      const adultIds = Array.from({ length: adultCount }, (_, index) => `A${index}`);
      const studentCount = Math.floor(random() * 4);
      const students = Array.from({ length: studentCount }, (_, index) => ({
        id: `S${index}`,
        coveredByAdultId: pick(adultIds)
      }));

      const items: MoneyItem[] = Array.from(
        { length: Math.floor(random() * 12) },
        () => {
          const kind = pick(["adult", "student", "shared"] as const);
          const amountCentavos = Math.floor(random() * 100_000);
          if (kind === "adult") {
            return {
              amountCentavos,
              assignmentType: "adult",
              assignedAdultId: pick(adultIds)
            };
          }
          if (kind === "student" && students.length > 0) {
            return {
              amountCentavos,
              assignmentType: "student",
              assignedStudentId: pick(students).id
            };
          }
          return { amountCentavos, assignmentType: "shared" };
        }
      );

      const auto = computeShares({
        presentAdults: adultIds,
        presentStudents: students,
        items,
        totalMode: "auto"
      });
      expect(auto.shares.reduce((sum, share) => sum + share.totalCentavos, 0)).toBe(
        auto.totalCentavos
      );
      expect(auto.shares.every((share) => share.totalCentavos >= 0)).toBe(true);

      const manualTotal = Math.floor(random() * 1_000_000);
      const manual = computeShares({
        presentAdults: adultIds,
        presentStudents: students,
        items,
        totalMode: "manual",
        manualTotalCentavos: manualTotal
      });
      expect(manual.totalCentavos).toBe(manualTotal);
      expect(manual.shares.reduce((sum, share) => sum + share.totalCentavos, 0)).toBe(manualTotal);
      expect(manual.shares.every((share) => share.totalCentavos >= 0)).toBe(true);
    }
  });
});
