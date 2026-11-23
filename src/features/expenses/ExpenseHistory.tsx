import { describeExpenseEvent } from "@/features/activity/describeEvent";
import type { ExpenseEvent } from "./types";
import { formatRelativeTime } from "@/lib/dates";

export function ExpenseHistory({ events }: { events: ExpenseEvent[] }) {
  if (events.length === 0) {
    return <p className="panel-copy">No changes yet.</p>;
  }

  return (
    <div className="activity-list">
      {[...events].reverse().map((event) => (
        <div className="activity-row" key={event.id}>
          <div>
            <p className="row-title">{describeExpenseEvent(event)}</p>
            <p className="row-sub">
              {event.actorName} · {formatRelativeTime(event.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
