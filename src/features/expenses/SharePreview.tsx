import { useMemo } from "react";
import { computeExpenseShares } from "@/domain/money/computeExpenseShares";
import { formatPeso } from "@/domain/money/format";
import type { ExpenseDraft } from "@/domain/money/types";
import { MoneyValidationError } from "@/domain/money/validate";

export function SharePreview({
  draft,
  names
}: {
  draft: ExpenseDraft;
  names: Map<string, string>;
}) {
  const result = useMemo(() => {
    try {
      return { value: computeExpenseShares(draft), error: null as string | null };
    } catch (error) {
      return {
        value: null,
        error:
          error instanceof MoneyValidationError
            ? error.message
            : "Check the people, items, and coverage."
      };
    }
  }, [draft]);

  if (!result.value) {
    return <p className="form-error">{result.error}</p>;
  }

  const payerName = names.get(draft.payerPersonId) ?? "Payer";

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <p className="panel-label">Split preview</p>
          <h2 className="panel-title">{formatPeso(result.value.totalCentavos)}</h2>
        </div>
      </div>

      <div className="stack">
        {result.value.shares.map((share) => (
          <div className="share-row" key={share.personId}>
            <div>
              <p className="row-title">{names.get(share.personId) ?? "Person"}</p>
              <p className="row-sub">
                {share.coveredByPersonId
                  ? `Covered by ${names.get(share.coveredByPersonId) ?? "someone"}`
                  : share.coveredCentavos > 0
                    ? `Covers ${formatPeso(share.coveredCentavos)}`
                    : "Pays their own share"}
              </p>
            </div>
            <p className="amount">{formatPeso(share.owedCentavos)}</p>
          </div>
        ))}
      </div>

      <div className="ticket-rule" />

      <div className="stack">
        {result.value.shares
          .filter(
            (share) =>
              share.personId !== draft.payerPersonId && share.owedCentavos > 0
          )
          .map((share) => (
            <p className="panel-copy" key={share.personId}>
              {names.get(share.personId) ?? "Someone"} owes {payerName}{" "}
              <strong>{formatPeso(share.owedCentavos)}</strong>.
            </p>
          ))}
        {result.value.shares.every(
          (share) =>
            share.personId === draft.payerPersonId || share.owedCentavos === 0
        ) ? (
          <p className="panel-copy">The payer absorbed every other share.</p>
        ) : null}
      </div>
    </section>
  );
}
