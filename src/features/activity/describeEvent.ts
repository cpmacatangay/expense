import { formatPeso } from "@/domain/money/format";
import type { ActivityEvent } from "./types";
import type { ExpenseEvent } from "@/features/expenses/types";

export function describeExpenseEvent(event: ExpenseEvent): string {
  const before = event.before;
  const after = event.after;

  if (event.action === "created") {
    return `Created ${after?.description ?? "an expense"}`;
  }
  if (event.action === "deleted") {
    return `Deleted ${before?.description ?? "an expense"}`;
  }

  const changes: string[] = [];
  if (before?.description !== after?.description) changes.push("description");
  if (before?.expenseDate !== after?.expenseDate) changes.push("date");
  if (before?.payerPersonId !== after?.payerPersonId) changes.push("payer");
  if (before?.totalCentavos !== after?.totalCentavos) {
    changes.push(
      `total ${formatPeso(before?.totalCentavos ?? 0)} to ${formatPeso(
        after?.totalCentavos ?? 0
      )}`
    );
  }
  if (JSON.stringify(before?.items) !== JSON.stringify(after?.items)) {
    changes.push("items");
  }
  if (JSON.stringify(before?.people) !== JSON.stringify(after?.people)) {
    changes.push("people");
  }
  if (JSON.stringify(before?.coverage) !== JSON.stringify(after?.coverage)) {
    changes.push("coverage");
  }

  return changes.length > 0
    ? `Updated ${changes.join(", ")}`
    : "Updated the expense";
}

export function describeActivityEvent(event: ActivityEvent): string {
  if (event.amountCentavos !== null && event.kind.startsWith("payment_")) {
    return `${event.summary} ${formatPeso(event.amountCentavos)}`;
  }
  return event.summary;
}
