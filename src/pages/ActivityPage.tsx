import { useState } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { listActivity } from "@/features/activity/api";
import { describeActivity, shouldShowActivityDiff } from "@/features/activity/describe";
import type { ActivityFilter } from "@/features/activity/types";
import { useGroup } from "@/features/groups/groupContext";
import { listSettlements } from "@/features/ledger/api";
import { listOutings } from "@/features/outings/api";
import { formatRelativeTime } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";

const filters: { id: ActivityFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "settlements", label: "Settlements" },
  { id: "outings", label: "Outings" },
  { id: "members", label: "Members" }
];

export function ActivityPage() {
  const { group, adults, students } = useGroup();
  const [filter, setFilter] = useState<ActivityFilter>("all");

  const activity = useInfiniteQuery({
    queryKey: ["activity", group?.id, filter],
    queryFn: ({ pageParam }) =>
      listActivity(group?.id as string, {
        before: pageParam,
        filter
      }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(group?.id)
  });

  const { data: outings } = useQuery({
    queryKey: ["outings", group?.id],
    queryFn: () => listOutings(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const { data: settlements } = useQuery({
    queryKey: ["settlements", group?.id],
    queryFn: () => listSettlements(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const events = activity.data?.pages.flatMap((page) => page.events) ?? [];

  const adultByProfile = new Map(
    adults.filter((adult) => adult.profile_id).map((adult) => [adult.profile_id, adult])
  );

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Activity</h1>
        <p className="page-sub">Every change at this table.</p>
      </header>

      <div className="activity-filters" role="tablist" aria-label="Activity filters">
        {filters.map((option) => (
          <button
            key={option.id}
            className={`activity-filter${filter === option.id ? " is-active" : ""}`}
            type="button"
            role="tab"
            aria-selected={filter === option.id}
            onClick={() => setFilter(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <section className="panel" aria-label="Activity feed">
        {activity.isLoading ? <p className="panel-copy">Loading activity…</p> : null}

        {activity.error ? (
          <p className="form-error" role="alert">
            {getErrorMessage(activity.error, "Could not load activity")}
          </p>
        ) : null}

        {!activity.isLoading && events.length === 0 ? (
          <p className="panel-copy">
            {filter === "all"
              ? "Nothing has happened yet. Start an outing or invite an adult."
              : "No activity in this filter yet."}
          </p>
        ) : null}

        <div className="activity-list">
          {events.map((event) => {
            const actor = event.actor_profile_id
              ? adultByProfile.get(event.actor_profile_id)
              : undefined;
            const actorName = event.actor?.display_name ?? actor?.display_name ?? "Someone";
            const description = describeActivity(event, {
              adults,
              students,
              outings: outings ?? [],
              settlements: settlements ?? []
            });

            return (
              <article className="activity-row" key={event.id}>
                <span
                  className="member-initials"
                  style={{ background: actor?.color ?? "#5D6B63" }}
                >
                  {initials(actorName)}
                </span>
                <div className="row-main">
                  <span className="row-title">
                    <strong>{actorName}</strong> {description.text}
                  </span>
                  <span className="row-sub">
                    {formatRelativeTime(event.created_at)} · {description.tag}
                  </span>
                  {description.link ? (
                    <Link className="text-action" to={description.link}>
                      Open outing
                    </Link>
                  ) : null}
                  {description.diff.length > 0 &&
                  shouldShowActivityDiff(event.action) ? (
                    <details className="activity-detail">
                      <summary>Before and after</summary>
                      <div className="activity-diff">
                        {description.diff.map((row, index) => (
                          <div className="activity-diff-row" key={`${row.label}-${index}`}>
                            <span className="activity-diff-key">{row.label}</span>
                            <span className="activity-diff-value">
                              {row.before !== undefined
                                ? `${row.before} → ${row.after ?? "—"}`
                                : row.after}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>

        {activity.hasNextPage ? (
          <button
            className="secondary-action"
            type="button"
            onClick={() => void activity.fetchNextPage()}
            disabled={activity.isFetchingNextPage}
          >
            {activity.isFetchingNextPage ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </section>
    </div>
  );
}
