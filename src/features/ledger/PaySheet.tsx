import { useState } from "react";
import { formatPeso } from "@/domain/money/format";
import { PaymentQrImage } from "@/features/payments/PaymentQrImage";
import { getErrorMessage } from "@/lib/errors";
import { Sheet } from "@/ui/primitives/Sheet";
import { markPaid } from "./api";
import type { Debt } from "./types";

export function PaySheet({
  debt,
  open,
  onClose,
  onPaid
}: {
  debt: Debt | null;
  open: boolean;
  onClose: () => void;
  onPaid: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!debt) return null;

  async function pay() {
    if (!debt) return;
    setBusy(true);
    setError(null);
    try {
      await markPaid(debt.otherPersonId);
      onPaid();
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not mark the payment paid"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Pay ${debt.otherName}`}>
      <p className="panel-copy">
        {debt.direction === "you_owe"
          ? `Send ${formatPeso(debt.amountCentavos)} to ${debt.otherName}.`
          : `${debt.otherName} will send you ${formatPeso(debt.amountCentavos)}.`}
      </p>

      {debt.qrPath ? (
        <div className="qr-inline">
          <PaymentQrImage path={debt.qrPath} name={debt.otherName} />
          <p className="panel-copy">Scan with your banking app, then mark it paid.</p>
        </div>
      ) : (
        <p className="panel-copy">
          No payment QR from {debt.otherName} yet. Ask them for one, or mark it paid after you
          send it.
        </p>
      )}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <button className="primary-action" type="button" onClick={() => void pay()} disabled={busy}>
        {busy ? "Marking." : "Mark paid"}
      </button>
    </Sheet>
  );
}
