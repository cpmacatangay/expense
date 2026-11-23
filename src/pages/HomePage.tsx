import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { formatPeso } from "@/domain/money/format";
import { ActivityList } from "@/features/activity/ActivityList";
import { useQuery } from "@tanstack/react-query";
import { recentActivity } from "@/features/activity/api";
import { useLedger } from "@/features/ledger/useLedger";
import { DebtRow } from "@/features/ledger/DebtRow";
import { PaySheet } from "@/features/ledger/PaySheet";
import { useMe } from "@/features/me/useMe";
import type { Debt } from "@/features/ledger/types";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";

export function HomePage() {
  const { data: me } = useMe();
  const { data: ledger, isLoading, error } = useLedger();
  const { data: activity } = useQuery({
    queryKey: ["activity", "recent"],
    queryFn: () => recentActivity(5),
    staleTime: 30_000
  });
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const queryClient = useQueryClient();
  const [payError, setPayError] = useState<string | null>(null);

  usePageTitle("Home");

  const firstName = me?.displayName.split(" ")[0] ?? "there";
  const debts = ledger?.debts ?? [];
  const allSquare =
    (ledger?.youOweCentavos ?? 0) === 0 && (ledger?.owedToYouCentavos ?? 0) === 0;

  async function paid() {
    setPayError(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["ledger"] }),
      queryClient.invalidateQueries({ queryKey: ["activity", "recent"] })
    ]);
  }

  return (
    <div className="page home-page">
      <header className="page-head">
        <h1 className="page-title">Hi, {firstName}</h1>
        <p className="page-sub">Your shared expenses, one debt at a time.</p>
      </header>

      <section className="home-lead">
        <div className="ticket">
          <p className="ticket-label">Your balance</p>
          {isLoading ? (
            <p className="ticket-copy">Loading your ledger.</p>
          ) : error ? (
            <p className="form-error" role="alert">
              {getErrorMessage(error, "Could not load your balance")}
            </p>
          ) : allSquare ? (
            <p className="ticket-figure">All square.</p>
          ) : (
            <div className="stack">
              <p className="ticket-figure">
                {formatPeso(
                  (ledger?.youOweCentavos ?? 0) > 0
                    ? (ledger?.youOweCentavos ?? 0)
                    : (ledger?.owedToYouCentavos ?? 0)
                )}
              </p>
              <p className="ticket-copy">
                {(ledger?.youOweCentavos ?? 0) > 0
                  ? `You owe ${formatPeso(ledger?.youOweCentavos ?? 0)}.`
                  : `${formatPeso(ledger?.owedToYouCentavos ?? 0)} is owed to you.`}
              </p>
            </div>
          )}
        </div>

        <Link className="primary-action" to="/expenses/new">
          <Icon name="plus" />
          New expense
        </Link>
      </section>

      {payError ? (
        <p className="form-error" role="alert">
          {payError}
        </p>
      ) : null}

      {debts.length > 0 ? (
        <section className="panel">
          <div className="section-head">
            <h2 className="panel-title">Open debts</h2>
          </div>
          <div className="ledger-rows">
            {debts.map((debt) => (
              <DebtRow
                key={debt.otherPersonId}
                debt={debt}
                onPay={() => setSelectedDebt(debt)}
                onQr={() => setSelectedDebt(debt)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Recent activity</h2>
          <Link className="text-action" to="/expenses">
            See all
          </Link>
        </div>
        <ActivityList
          events={activity ?? []}
          emptyCopy="Nothing yet. Record the first expense."
        />
      </section>

      <PaySheet
        debt={selectedDebt}
        open={selectedDebt !== null}
        onClose={() => setSelectedDebt(null)}
        onPaid={() => void paid()}
      />
    </div>
  );
}
