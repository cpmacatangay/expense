import { describe, expect, it } from "vitest";
import { describeActivityEvent, describeExpenseEvent } from "./describeEvent";
import type { ActivityEvent } from "./types";
import type { ExpenseEvent } from "@/features/expenses/types";

function expenseEvent(
  action: ExpenseEvent["action"],
  before: ExpenseEvent["before"],
  after: ExpenseEvent["after"]
): ExpenseEvent {
  return {
    id: "e1",
    actorPersonId: "a",
    actorName: "Mai",
    action,
    before,
    after,
    createdAt: "2026-11-17T12:00:00Z"
  };
}

describe("describeExpenseEvent", () => {
  it("describes creation and deletion", () => {
    expect(
      describeExpenseEvent(
        expenseEvent("created", null, { description: "Dinner", totalCentavos: 1000 })
      )
    ).toBe("Created Dinner");
    expect(
      describeExpenseEvent(
        expenseEvent("deleted", { description: "Dinner" }, null)
      )
    ).toBe("Deleted Dinner");
  });

  it("names changed values", () => {
    expect(
      describeExpenseEvent(
        expenseEvent(
          "updated",
          { description: "Dinner", totalCentavos: 1000 },
          { description: "Dinner", totalCentavos: 1200 }
        )
      )
    ).toContain("total");
  });
});

describe("describeActivityEvent", () => {
  it("adds the amount to payment activity", () => {
    const event: ActivityEvent = {
      id: "p1",
      kind: "payment_marked",
      createdAt: "2026-11-17T12:00:00Z",
      actorName: "Mai",
      expenseId: null,
      expenseDescription: null,
      otherPersonId: "b",
      otherName: "Mai",
      amountCentavos: 40000,
      summary: "Marked a payment paid"
    };
    expect(describeActivityEvent(event)).toContain("₱400.00");
  });
});
