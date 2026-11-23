import { formatPeso } from "@/domain/money/format";
import type { Debt } from "./types";
import { Icon } from "@/ui/primitives/Icon";

export function DebtRow({
  debt,
  onPay,
  onQr,
  onHistory,
  busy = false
}: {
  debt: Debt;
  onPay: () => void;
  onQr: () => void;
  onHistory?: () => void;
  busy?: boolean;
}) {
  const youOwe = debt.direction === "you_owe";

  return (
    <div className="ledger-row">
      <div className="row-main">
        <p className="row-title">
          {youOwe ? `You owe ${debt.otherName}` : `${debt.otherName} owes you`}
        </p>
        <p className="row-sub">
          {youOwe ? "Pay the full amount when you are ready." : "Mark it paid when it lands."}
        </p>
      </div>
      <div className="ledger-actions">
        <p className="amount">{formatPeso(debt.amountCentavos)}</p>
        {debt.hasQr ? (
          <button className="text-action" type="button" onClick={onQr}>
            <Icon name="qr" />
            Scan
          </button>
        ) : null}
        {onHistory ? (
          <button className="text-action" type="button" onClick={onHistory}>
            History
          </button>
        ) : null}
        <button className="secondary-action" type="button" onClick={onPay} disabled={busy}>
          {busy ? "Marking." : "Mark paid"}
        </button>
      </div>
    </div>
  );
}
