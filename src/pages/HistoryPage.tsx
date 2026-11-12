import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatPeso } from "@/domain/money/format";
import { useGroup } from "@/features/groups/groupContext";
import { loadHistory } from "@/features/history/api";
import { filterHistory } from "@/features/history/filterHistory";
import type { HistoryFilters } from "@/features/history/types";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";

const emptyFilters: HistoryFilters = {
  from: "",
  to: "",
  adultId: "",
  studentId: ""
};

export function HistoryPage() {
  const { group, adults } = useGroup();
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);

  usePageTitle("History");

  const { data, isLoading, error } = useQuery({
    queryKey: ["history", group?.id],
    queryFn: () => loadHistory(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const students = useMemo(() => data?.students ?? [], [data?.students]);

  const filtered = useMemo(() => filterHistory(entries, filters), [entries, filters]);

  const adultById = useMemo(() => new Map(adults.map((adult) => [adult.id, adult])), [adults]);

  const hasFilters = Boolean(filters.from || filters.to || filters.adultId || filters.studentId);

  function update<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="page page--list">
      <div className="editor-head">
        <Link className="text-link" to="/">
          <Icon name="chevron-left" />
          Back
        </Link>
        <header className="page-head">
          <h1 className="page-title">History</h1>
          <p className="page-sub">Every finalized meal.</p>
        </header>
      </div>

      <section className="panel">
        <h2 className="panel-title" id="history-filter-title">
          Find an outing
        </h2>

        <search className="history-filters" aria-labelledby="history-filter-title">
          <fieldset className="filter-group">
            <legend>Date range</legend>
            <div className="field-pair">
              <label className="field" htmlFor="history-from">
                <span>From</span>
                <input
                  id="history-from"
                  name="from"
                  type="date"
                  value={filters.from}
                  onChange={(event) => update("from", event.target.value)}
                />
              </label>
              <label className="field" htmlFor="history-to">
                <span>To</span>
                <input
                  id="history-to"
                  name="to"
                  type="date"
                  value={filters.to}
                  onChange={(event) => update("to", event.target.value)}
                />
              </label>
            </div>
          </fieldset>

          <label className="field" htmlFor="history-adult">
            <span>Adult</span>
            <select
              id="history-adult"
              name="adult"
              value={filters.adultId}
              onChange={(event) => update("adultId", event.target.value)}
            >
              <option value="">Anyone</option>
              {adults.map((adult) => (
                <option key={adult.id} value={adult.id}>
                  {adult.display_name}
                  {adult.status === "removed" ? " (removed)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="field" htmlFor="history-student">
            <span>Student</span>
            <select
              id="history-student"
              name="student"
              value={filters.studentId}
              onChange={(event) => update("studentId", event.target.value)}
            >
              <option value="">Anyone</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                  {student.status === "archived" ? " (archived)" : ""}
                </option>
              ))}
            </select>
          </label>

          {hasFilters ? (
            <button className="text-action" type="button" onClick={() => setFilters(emptyFilters)}>
              <Icon name="x" />
              Clear filters
            </button>
          ) : null}
        </search>
      </section>

      <section className="panel">
        <h2 className="panel-title">
          {isLoading
            ? "Outings"
            : `${filtered.length} ${filtered.length === 1 ? "outing" : "outings"}`}
        </h2>

        {isLoading ? <p className="panel-copy">Loading outings…</p> : null}

        {error ? (
          <p className="form-error" role="alert">
            {getErrorMessage(error, "Could not load history")}
          </p>
        ) : null}

        {!isLoading && entries.length === 0 ? (
          <p className="panel-copy">No finalized outings yet.</p>
        ) : null}

        {!isLoading && entries.length > 0 && filtered.length === 0 ? (
          <p className="panel-copy">No outings match these filters.</p>
        ) : null}

        <ul className="outing-list" role="list">
          {filtered.map((entry) => {
            const payer = entry.payerAdultId
              ? adultById.get(entry.payerAdultId)?.display_name
              : null;
            const adultCount = entry.presentAdultIds.length;
            const studentCount = entry.presentStudentIds.length;

            return (
              <li key={entry.id}>
                <Link className="outing-link" to={`/outings/${entry.id}`}>
                  <span>
                    <span className="row-title">{entry.place || "Untitled outing"}</span>
                    <span className="row-sub">
                      {formatDate(entry.date)}
                      {payer ? ` · Paid by ${payer}` : ""}
                      {` · ${adultCount} at the table`}
                      {studentCount > 0
                        ? ` · ${studentCount} ${studentCount === 1 ? "student" : "students"}`
                        : ""}
                    </span>
                  </span>
                  <span className="amount">{formatPeso(entry.totalCentavos)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
