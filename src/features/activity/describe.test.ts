import { describe, expect, it } from "vitest";
import type { Adult } from "@/features/groups/types";
import type { Settlement } from "@/features/ledger/types";
import type { Outing } from "@/features/outings/types";
import { describeActivity, type ActivityContext } from "./describe";
import type { ActivityEvent } from "./types";

const adults: Adult[] = [
  {
    id: "a1",
    profile_id: "p1",
    display_name: "[redacted-name]",
    status: "active",
    color: "#1F5C45"
  },
  { id: "a2", profile_id: "p2", display_name: "Mai", status: "active", color: "#A83232" }
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
  total_centavos: 10000,
  version: 3,
  finalized_at: null,
  reopened_at: null,
  created_at: "2026-11-10T00:00:00Z",
  updated_at: "2026-11-10T00:00:00Z"
};

const settlement: Settlement = {
  id: "s1",
  group_id: "g1",
  from_adult_id: "a2",
  to_adult_id: "a1",
  amount_centavos: 2500,
  date: "2026-11-10",
  note: "Cash",
  status: "confirmed",
  recorded_by: "p2",
  confirmed_by: "p1",
  decided_at: null,
  decline_reason: null,
  voided_at: null,
  voided_by: null,
  created_at: "2026-11-10T00:00:00Z"
};

const context: ActivityContext = {
  adults,
  students: [],
  outings: [outing],
  settlements: [settlement]
};

function event(partial: Partial<ActivityEvent> & Pick<ActivityEvent, "action">): ActivityEvent {
  return {
    id: "e1",
    group_id: "g1",
    actor_profile_id: "p3",
    entity_type: "outing",
    entity_id: "o1",
    before_json: null,
    after_json: null,
    created_at: "2026-11-10T00:00:00Z",
    actor: null,
    ...partial
  };
}

describe("describeActivity", () => {
  it("describes a confirmed settlement with names and amount", () => {
    const result = describeActivity(
      event({
        action: "settlement.confirmed",
        entity_type: "settlement",
        entity_id: "s1",
        before_json: { status: "pending" },
        after_json: { status: "confirmed", amountCentavos: 2500 }
      }),
      context
    );

    expect(result.text).toBe("confirmed ₱25.00 from Mai");
    expect(result.tag).toBe("Settlement");
    expect(result.diff).toEqual([
      { label: "Status", before: "Pending", after: "Confirmed" },
      { label: "Amount", after: "₱25.00" }
    ]);
  });

  it("links outing events to the outing", () => {
    const result = describeActivity(
      event({ action: "outing.finalized", after_json: { totalCentavos: 10000 } }),
      context
    );

    expect(result.text).toBe("finalized McDo Il Corso");
    expect(result.link).toBe("/outings/o1");
    expect(result.tag).toBe("Outing");
  });

  it("shows before and after for a changed total", () => {
    const result = describeActivity(
      event({
        action: "outing.updated",
        before_json: { totalCentavos: 10000, totalMode: "auto" },
        after_json: { totalCentavos: 30000, totalMode: "auto" }
      }),
      context
    );

    expect(result.diff).toEqual([
      { label: "Total", before: "₱100.00", after: "₱300.00" }
    ]);
  });

  it("describes items with their outing", () => {
    const result = describeActivity(
      event({
        action: "item.created",
        entity_type: "item",
        entity_id: "i1",
        after_json: { name: "Rice", outingId: "o1" }
      }),
      context
    );

    expect(result.text).toBe("added Rice to McDo Il Corso");
    expect(result.link).toBe("/outings/o1");
    expect(result.tag).toBe("Item");
  });

  it("falls back for unknown actions", () => {
    const result = describeActivity(event({ action: "something.new" }), context);
    expect(result.text).toBe("something new");
  });
});
