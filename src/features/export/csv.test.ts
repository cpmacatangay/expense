import { describe, expect, it } from "vitest";
import { buildCsvFiles, exportBaseName, toCsv } from "./csv";
import type { GroupExport, MemberExport } from "./load";

const baseProfile = {
  id: "p1",
  email: "a@salo.ph",
  display_name: "Alpha"
};

const groupExport: GroupExport = {
  scope: "group",
  exported_at: "2026-11-11T00:00:00.000Z",
  group: {
    id: "g1",
    name: "Salo Crew",
    owner_id: "p1",
    status: "active"
  },
  profiles: [baseProfile],
  adults: [{ id: "a1", display_name: "Alpha", profile_id: "p1" }],
  students: [{ id: "s1", name: "Junior" }],
  outings: [{ id: "o1", date: "2026-11-10", total_centavos: 10000 }],
  outing_adults: [{ outing_id: "o1", adult_id: "a1", present: true }],
  outing_students: [],
  items: [{ id: "i1", name: "Rice", quantity: 1, unit_amount_centavos: 10000 }],
  shares: [{ outing_id: "o1", adult_id: "a1", total_centavos: 10000 }],
  settlements: [{ id: "st1", amount_centavos: 5000, status: "confirmed" }],
  activity_events: [{ id: "e1", action: "outing.created" }]
};

const memberExport: MemberExport = {
  scope: "member",
  exported_at: "2026-11-11T00:00:00.000Z",
  group: { id: "g1", name: "Salo Crew" },
  member: {
    profile: baseProfile,
    adult: { id: "a1", display_name: "Alpha", status: "active" }
  },
  outings: [{ id: "o1" }],
  shares: [{ outing_id: "o1", adult_id: "a1", total_centavos: 10000 }],
  settlements: [{ id: "st1", amount_centavos: 5000 }],
  activity_events: [{ id: "e1" }]
};

describe("toCsv", () => {
  it("quotes commas, quotes, and newlines", () => {
    const csv = toCsv([{ name: 'Mai, "B"', note: "line1\nline2" }]);
    expect(csv).toBe('name,note\r\n"Mai, ""B""","line1\nline2"');
  });

  it("unions columns across rows", () => {
    expect(toCsv([{ a: 1 }, { b: 2 }])).toBe("a,b\r\n1,\r\n,2");
  });

  it("serializes nested activity values", () => {
    expect(toCsv([{ after_json: { status: "confirmed" } }])).toBe(
      'after_json\r\n"{""status"":""confirmed""}"'
    );
  });

  it("neutralizes spreadsheet formulas in text cells", () => {
    expect(toCsv([{ name: "=SUM(A1)" }])).toBe("name\r\n'=SUM(A1)");
    expect(toCsv([{ name: "-1+1" }])).toBe("name\r\n'-1+1");
    expect(toCsv([{ amount: -500 }])).toBe("amount\r\n-500");
  });
});

describe("buildCsvFiles", () => {
  it("includes every group table and excludes QR columns", () => {
    const files = buildCsvFiles(groupExport);

    expect(Object.keys(files)).toEqual([
      "README.txt",
      "group.csv",
      "profiles.csv",
      "adults.csv",
      "students.csv",
      "outings.csv",
      "outing_adults.csv",
      "outing_students.csv",
      "items.csv",
      "shares.csv",
      "settlements.csv",
      "activity.csv"
    ]);
    expect(files["adults.csv"]).not.toContain("payment_qr");
    expect(files["README.txt"]).toContain("Payment QR images are never included");
    expect(files["shares.csv"]).toContain("10000");
  });

  it("scopes a member export to that member", () => {
    const files = buildCsvFiles(memberExport);

    expect(Object.keys(files)).toEqual([
      "README.txt",
      "member.csv",
      "outings.csv",
      "shares.csv",
      "settlements.csv",
      "activity.csv"
    ]);
    expect(files["member.csv"]).toContain("a@salo.ph");
    expect(files["README.txt"]).toContain("Member export for Alpha");
  });

  it("keeps a readable README for an empty group", () => {
    const files = buildCsvFiles({
      ...groupExport,
      adults: [],
      students: [],
      outings: [],
      outing_adults: [],
      outing_students: [],
      items: [],
      shares: [],
      settlements: [],
      activity_events: []
    });

    expect(files["outings.csv"]).toBe("");
    expect(files["README.txt"]).toContain("Full group export");
  });
});

describe("exportBaseName", () => {
  it("names group and member files with the date", () => {
    expect(exportBaseName(groupExport)).toMatch(/^salo-salo-crew-\d{4}-\d{2}-\d{2}$/);
    expect(exportBaseName(memberExport)).toMatch(/^salo-salo-crew-alpha-\d{4}-\d{2}-\d{2}$/);
  });
});
