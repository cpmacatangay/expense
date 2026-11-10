import { describe, expect, it } from "vitest";
import { largestRemainder } from "./allocate";

describe("largestRemainder", () => {
  it("splits an equal total with the remainder first", () => {
    expect(largestRemainder(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(largestRemainder(1, [1, 1])).toEqual([1, 0]);
    expect(largestRemainder(0, [1, 1, 1])).toEqual([0, 0, 0]);
  });

  it("respects weighted shares", () => {
    expect(largestRemainder(100, [1, 3])).toEqual([25, 75]);
    expect(largestRemainder(10, [1, 1, 2])).toEqual([3, 2, 5]);
  });

  it("uses equal weights when all weights are zero", () => {
    expect(largestRemainder(7, [0, 0, 0])).toEqual([3, 2, 2]);
  });

  it("always returns non-negative amounts that sum to the total", () => {
    let seed = 42;
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let run = 0; run < 1000; run += 1) {
      const total = Math.floor(random() * 1_000_000);
      const weightCount = 1 + Math.floor(random() * 12);
      const weights = Array.from({ length: weightCount }, () => Math.floor(random() * 10_000));
      const amounts = largestRemainder(total, weights);
      expect(amounts).toHaveLength(weightCount);
      expect(amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0)).toBe(true);
      expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(total);
    }
  });
});
