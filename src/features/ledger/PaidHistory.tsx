import { formatPeso } from "@/domain/money/format";
import { formatDate } from "@/lib/dates";
import type { Payment } from "./types";

export function PaidHistory({
  payments,
  meId,
  onUndo,
  busyId
}: {
  payments: Payment[];
  meId: string;
  onUndo: (payment: Payment) => void;
  busyId: string | null;
}) {
  if (payments.length === 0) {
    return <p className="panel-copy">No payments yet.</p>;
  }

  return (
    <div className="activity-list">
      {payments.map((payment) => {
        const direction =
          payment.fromPersonId === meId ? "You paid" : "They paid";
        return (
          <div className="activity-row" key={payment.id}>
            <div>
              <p className="row-title">
                {direction} {formatPeso(payment.amountCentavos)}
              </p>
              <p className="row-sub">
                {formatDate(payment.markedAt.slice(0, 10))}
                {payment.undoneAt ? " · Undone" : ""}
              </p>
            </div>
            {payment.undoneAt ? null : (
              <button
                className="text-action"
                type="button"
                onClick={() => onUndo(payment)}
                disabled={busyId === payment.id}
              >
                {busyId === payment.id ? "Undoing." : "Undo"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
