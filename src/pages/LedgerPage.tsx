import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPeso } from "@/domain/money/format";
import { DebtRow } from "@/features/ledger/DebtRow";
import { PaidHistory } from "@/features/ledger/PaidHistory";
import { PaySheet } from "@/features/ledger/PaySheet";
import { pairHistory, undoPayment } from "@/features/ledger/api";
import { useLedger } from "@/features/ledger/useLedger";
import type { Debt, Payment } from "@/features/ledger/types";
import { useMe } from "@/features/me/useMe";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";

export function LedgerPage() {
  const { data: me } = useMe();
  const { data: ledger, isLoading, error } = useLedger();
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [selectedOther, setSelectedOther] = useState<string | null>(null);
  const [busyPayment, setBusyPayment] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  usePageTitle("Ledger");

  const { data: history } = useQuery({
    queryKey: ["pair", selectedOther],
    queryFn: () => pairHistory(selectedOther as string),
    enabled: Boolean(selectedOther)
  });

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ledger"] }),
      queryClient.invalidateQueries({ queryKey: ["activity", "recent"] }),
      queryClient.invalidateQueries({ queryKey: ["pair", selectedOther] })
    ]);
  }

  async function handleUndo(payment: Payment) {
    setBusyPayment(payment.id);
    setActionError(null);
    try {
      await undoPayment(payment.id);
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not undo the payment"));
    } finally {
      setBusyPayment(null);
    }
  }

  const debts = ledger?.debts ?? [];

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Ledger</h1>
        <p className="page-sub">One net amount per person. Mark the full debt paid when it is done.</p>
      </header>

      <section className="ticket">
        <p className="ticket-label">Your balance</p>
        <div className="split">
          <div>
            <p className="ticket-figure">{formatPeso(ledger?.youOweCentavos ?? 0)}</p>
            <p className="ticket-copy">You owe</p>
          </div>
          <div>
            <p className="ticket-figure">{formatPeso(ledger?.owedToYouCentavos ?? 0)}</p>
            <p className="ticket-copy">Owed to you</p>
          </div>
        </div>
      </section>

      {isLoading ? <p className="panel-copy">Loading the ledger.</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {getErrorMessage(error, "Could not load the ledger")}
        </p>
      ) : null}
      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {!isLoading && !error && debts.length === 0 ? (
        <section className="panel">
          <h2 className="panel-title">All square.</h2>
          <p className="panel-copy">No one owes anyone right now.</p>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Debts</h2>
        </div>
        <div className="ledger-rows">
          {debts.map((debt) => (
            <DebtRow
              key={debt.otherPersonId}
              debt={debt}
              onPay={() => setSelectedDebt(debt)}
              onQr={() => setSelectedDebt(debt)}
              onHistory={() => setSelectedOther(debt.otherPersonId)}
            />
          ))}
        </div>
      </section>

      {selectedOther && history ? (
        <section className="panel">
          <div className="section-head">
            <h2 className="panel-title">Paid history · {history.other.displayName}</h2>
            <button className="text-action" type="button" onClick={() => setSelectedOther(null)}>
              Close
            </button>
          </div>
          <PaidHistory
            payments={history.payments}
            meId={me?.id ?? ""}
            onUndo={(payment) => void handleUndo(payment)}
            busyId={busyPayment}
          />
        </section>
      ) : null}

      <PaySheet
        debt={selectedDebt}
        open={selectedDebt !== null}
        onClose={() => setSelectedDebt(null)}
        onPaid={() => void refresh()}
      />
    </div>
  );
}
