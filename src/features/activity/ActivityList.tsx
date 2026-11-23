import { Link } from "react-router-dom";
import { describeActivityEvent } from "./describeEvent";
import type { ActivityEvent } from "./types";
import { formatRelativeTime } from "@/lib/dates";

export function ActivityList({
  events,
  emptyCopy = "No activity yet."
}: {
  events: ActivityEvent[];
  emptyCopy?: string;
}) {
  if (events.length === 0) {
    return <p className="panel-copy">{emptyCopy}</p>;
  }

  return (
    <div className="activity-list">
      {events.map((event) => {
        const canOpen =
          event.expenseId !== null && event.kind !== "expense_deleted";
        const content = (
          <>
            <div>
              <p className="row-title">{describeActivityEvent(event)}</p>
              <p className="row-sub">
                {event.actorName} · {formatRelativeTime(event.createdAt)}
              </p>
            </div>
          </>
        );

        return canOpen ? (
          <Link
            className="activity-row"
            to={`/expenses/${event.expenseId}`}
            key={`${event.kind}-${event.id}-${event.createdAt}`}
          >
            {content}
          </Link>
        ) : (
          <div
            className="activity-row"
            key={`${event.kind}-${event.id}-${event.createdAt}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}
