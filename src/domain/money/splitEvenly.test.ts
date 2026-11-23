import { describe, expect, it } from "vitest";
import { splitEvenly } from "./splitEvenly";
import { MoneyValidationError } from "./validate";

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

describe("splitEvenly", () => {
  it("splits a total equally", () => {
    expect(splitEvenly(10000, 2)).toEqual([5000, 5000]);
    expect(splitEvenly(10000, 4)).toEqual([2500, 2500, 2500, 2500]);
  });

  it("assigns the remainder to the first people", () => {
    expect(splitEvenly(10000, 3)).toEqual([3334, 3333, 3333]);
    expect(splitEvenly(10001, 3)).toEqual([3334, 3334, 3333]);
    expect(splitEvenly(101, 3)).toEqual([34, 34, 33]);
  });

  it("keeps every line at one centavo or more", () => {
    expect(splitEvenly(3, 3)).toEqual([1, 1, 1]);
    expect(splitEvenly(12, 12)).toEqual(Array(12).fill(1));
  });

  it("sums exactly to the total and never differs by more than one centavo", () => {
    for (let total = 2; total <= 5000; total += 37) {
      for (let count = 2; count <= 12; count += 1) {
        if (total < count) continue;
        const parts = splitEvenly(total, count);
        expect(parts).toHaveLength(count);
        expect(sum(parts)).toBe(total);
        expect(Math.max(...parts) - Math.min(...parts)).toBeLessThanOrEqual(1);
        expect(parts.every((part) => part >= 1)).toBe(true);
      }
    }
  });

  it("rejects invalid totals and people counts", () => {
    expect(() => splitEvenly(0, 2)).toThrow(MoneyValidationError);
    expect(() => splitEvenly(100, 1)).toThrow(MoneyValidationError);
    expect(() => splitEvenly(100, 13)).toThrow(MoneyValidationError);
    expect(() => splitEvenly(1, 2)).toThrow(
      "The total is too small to split across these people"
    );
  });
});
