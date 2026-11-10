import { describe, expect, it } from "vitest";
import { filterHistory } from "./filterHistory";
import type { HistoryEntry, HistoryFilters } from "./types";

const all: HistoryFilters = { from: "", to: "", adultId: "", studentId: "" };

const entries: HistoryEntry[] = [
  {
    id: "o1",
    date: "2026-11-01",
    place: "Harbor Dinner",
    totalCentavos: 120000,
    payerAdultId: "a1",
    presentAdultIds: ["a1", "a2"],
    presentStudentIds: ["s1"]
  },
  {
    id: "o2",
    date: "2026-11-08",
    place: "Lunch",
    totalCentavos: 40000,
    payerAdultId: "a2",
    presentAdultIds: ["a1"],
    presentStudentIds: []
  },
  {
    id: "o3",
    date: "2026-11-10",
    place: null,
    totalCentavos: 60000,
    payerAdultId: "a1",
    presentAdultIds: ["a2", "a3"],
    presentStudentIds: ["s1", "s2"]
  }
];

describe("filterHistory", () => {
  it("returns every outing without filters", () => {
    expect(filterHistory(entries, all).map((entry) => entry.id)).toEqual(["o1", "o2", "o3"]);
  });

  it("filters an inclusive date range", () => {
    const result = filterHistory(entries, {
      ...all,
      from: "2026-11-08",
      to: "2026-11-10"
    });
    expect(result.map((entry) => entry.id)).toEqual(["o2", "o3"]);
  });

  it("filters by a present adult", () => {
    expect(filterHistory(entries, { ...all, adultId: "a3" }).map((entry) => entry.id)).toEqual([
      "o3"
    ]);
  });

  it("filters by a present student", () => {
    expect(filterHistory(entries, { ...all, studentId: "s2" }).map((entry) => entry.id)).toEqual([
      "o3"
    ]);
  });

  it("combines filters", () => {
    expect(
      filterHistory(entries, {
        from: "2026-11-02",
        to: "2026-11-30",
        adultId: "a2",
        studentId: ""
      }).map((entry) => entry.id)
    ).toEqual(["o3"]);
  });

  it("returns nothing when the filters conflict", () => {
    expect(
      filterHistory(entries, { ...all, from: "2026-11-09", adultId: "a1" }).map(
        (entry) => entry.id
      )
    ).toEqual([]);
  });
});
