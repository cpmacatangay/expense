import { describe, expect, it } from "vitest";
import type { Adult } from "@/features/groups/types";
import type { Outing } from "@/features/outings/types";
import { buildRecap } from "./buildRecap";

const adults: Adult[] = [
  { id: "a1", profile_id: "p1", display_name: "Christian", status: "active", color: "#1F5C45" },
  { id: "a2", profile_id: "p2", display_name: "Mai", status: "active", color: "#A83232" },
  { id: "a3", profile_id: "p3", display_name: "Kent", status: "active", color: "#8A5A12" }
];

const outing: Outing = {
  id: "o1",
  group_id: "g1",
  author_profile_id: "p1",
  date: "2026-11-10",
  place: "McDo Il Corso",
  notes: null,
  payer_adult_id: "a1",
  status: "finalized",
  total_mode: "auto",
  total_centavos: 90000,
  version: 2,
  finalized_at: null,
  reopened_at: null,
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z"
};

describe("buildRecap", () => {
  it("lists each share, the payer, and the settlement suggestions", () => {
    const recap = buildRecap({
      groupName: "Salo Crew",
      outing,
      shares: [
        { adultId: "a1", totalCentavos: 30000 },
        { adultId: "a2", totalCentavos: 30000 },
        { adultId: "a3", totalCentavos: 30000 }
      ],
      adults
    });

    expect(recap.totalLabel).toBe("₱900.00");
    expect(recap.payerName).toBe("Christian");
    expect(recap.shares.map((share) => share.name)).toEqual(["Christian", "Mai", "Kent"]);
    expect(recap.transfers).toEqual([
      { fromName: "Mai", toName: "Christian", amountCentavos: 30000, amountLabel: "₱300.00" },
      { fromName: "Kent", toName: "Christian", amountCentavos: 30000, amountLabel: "₱300.00" }
    ]);
    expect(recap.text).toContain("Salo · Salo Crew");
    expect(recap.text).toContain("McDo Il Corso");
    expect(recap.text).toContain("Total ₱900.00");
    expect(recap.text).toContain("Mai — ₱300.00");
    expect(recap.text).toContain("Paid by Christian");
    expect(recap.text).toContain("Mai pays Christian ₱300.00");
    expect(recap.text.toLowerCase()).not.toContain("invite");
    expect(recap.text.toLowerCase()).not.toContain("qr");
  });

  it("says everyone is square when the payer owes the only share", () => {
    const recap = buildRecap({
      groupName: "Salo Crew",
      outing: { ...outing, total_centavos: 50000 },
      shares: [{ adultId: "a1", totalCentavos: 50000 }],
      adults
    });

    expect(recap.transfers).toEqual([]);
    expect(recap.text).toContain("Everyone is square.");
  });

  it("handles a missing payer without throwing", () => {
    const recap = buildRecap({
      groupName: "Salo Crew",
      outing: { ...outing, payer_adult_id: null },
      shares: [{ adultId: "a1", totalCentavos: 90000 }],
      adults
    });

    expect(recap.payerName).toBeNull();
    expect(recap.text).toContain("No payer recorded");
  });
});
