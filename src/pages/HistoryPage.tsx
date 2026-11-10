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

const emptyFilters: HistoryFilters = {
  from: "",
  to: "",
  adultId: "",
  studentId: ""
};

export function HistoryPage() {
  const { group, adults } = useGroup();
  const [filters, setFilters] = useState<HistoryFilters>(emptyFilters);

  const { data, isLoading, error } = useQuery({
    queryKey: ["history", group?.id],
    queryFn: () => loadHistory(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const entries = useMemo(() => data?.entries ?? [], [data?.entries]);
  const students = useMemo(() => data?.students ?? [], [data?.students]);

  const filtered = useMemo(() => filterHistory(entries, filters), [entries, filters]);

  const adultById = useMemo(
    () => new Map(adults.map((adult) => [adult.id, adult])),
    [adults]
  );

  const hasFilters = Boolean(
    filters.from || filters.to || filters.adultId || filters.studentId
  );

  function update<K extends keyof HistoryFilters>(key: K, value: HistoryFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="page">
      <div className="editor-head">
        <Link className="text-action" to="/">
          Back
        </Link>
        <header className="page-head">
          <h1 className="page-title">History</h1>
          <p className="page-sub">Every finalized meal.</p>
        </header>
      </div>

      <section className="panel">
        <span className="panel-label">Filters</span>
        <h2 className="panel-title">Find an outing</h2>

        <div className="history-filters">
          <div className="field-pair">
            <label className="field">
              <span>From</span>
              <input
                type="date"
                value={filters.from}
                onChange={(event) => update("from", event.target.value)}
              />
            </label>
            <label className="field">
              <span>To</span>
              <input
                type="date"
                value={filters.to}
                onChange={(event) => update("to", event.target.value)}
              />
            </label>
          </div>

          <label className="field">
            <span>Adult</span>
            <select
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

          <label className="field">
            <span>Student</span>
            <select
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
            <button
              className="text-action"
              type="button"
              onClick={() => setFilters(emptyFilters)}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <span className="panel-label">Outings</span>
        <h2 className="panel-title">
          {isLoading
            ? "Loading…"
            : `${filtered.length} ${filtered.length === 1 ? "outing" : "outings"}`}
        </h2>

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

        <div className="outing-list">
          {filtered.map((entry) => {
            const payer = entry.payerAdultId
              ? adultById.get(entry.payerAdultId)?.display_name
              : null;
            const adultCount = entry.presentAdultIds.length;
            const studentCount = entry.presentStudentIds.length;

            return (
              <Link className="outing-link" key={entry.id} to={`/outings/${entry.id}`}>
                <span>
                  <strong>{entry.place || "Untitled outing"}</strong>
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
            );
          })}
        </div>
      </section>
    </div>
  );
}
