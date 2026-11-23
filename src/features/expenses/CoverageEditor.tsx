import type { ExpenseCoverage } from "./types";

export function CoverageEditor({
  people,
  payerPersonId,
  coverage,
  onChange
}: {
  people: { id: string; displayName: string }[];
  payerPersonId: string;
  coverage: ExpenseCoverage[];
  onChange: (next: ExpenseCoverage[]) => void;
}) {
  const coveredBy = new Map(
    coverage.map((entry) => [entry.coveredPersonId, entry.covererPersonId])
  );

  function setCovered(coveredPersonId: string, covererPersonId: string) {
    let next = coverage.filter((entry) => entry.coveredPersonId !== coveredPersonId);

    if (covererPersonId) {
      // The coverer cannot also be covered, and the covered person cannot cover anyone.
      next = next.filter((entry) => entry.coveredPersonId !== covererPersonId);
      next = next.filter((entry) => entry.covererPersonId !== coveredPersonId);
      next = [...next, { coveredPersonId, covererPersonId }];
    }

    onChange(next);
  }

  const candidates = people.filter((person) => person.id !== payerPersonId);

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="panel-label">Coverage</p>
          <h2 className="panel-title">Who covers whom</h2>
        </div>
      </div>
      <p className="panel-copy">
        One level only. A coverer absorbs the covered person's full share and cannot also be
        covered.
      </p>

      <div className="stack">
        {candidates.map((person) => {
          const value = coveredBy.get(person.id) ?? "";
          const options = people.filter(
            (candidate) =>
              candidate.id !== payerPersonId && candidate.id !== person.id
          );

          return (
            <label className="field" key={person.id}>
              <span>{person.displayName}</span>
              <select
                value={value}
                onChange={(event) => setCovered(person.id, event.target.value)}
              >
                <option value="">Pays own share</option>
                {options.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    Covered by {candidate.displayName}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
    </section>
  );
}
