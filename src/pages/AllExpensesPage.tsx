import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatPeso } from "@/domain/money/format";
import { expensesForMe } from "@/features/expenses/api";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";

export function AllExpensesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["expenses"],
    queryFn: expensesForMe,
    staleTime: 30_000
  });

  usePageTitle("All expenses");

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1 className="page-title">All expenses</h1>
          <p className="page-sub">Every expense you are on, newest first.</p>
        </div>
        <Link className="primary-action" to="/expenses/new">
          <Icon name="plus" />
          New expense
        </Link>
      </header>

      {isLoading ? <p className="panel-copy">Loading expenses.</p> : null}
      {error ? (
        <p className="form-error" role="alert">
          {getErrorMessage(error, "Could not load expenses")}
        </p>
      ) : null}

      {!isLoading && !error && (data ?? []).length === 0 ? (
        <section className="panel">
          <h2 className="panel-title">No expenses yet.</h2>
          <p className="panel-copy">Record the first one from Home.</p>
        </section>
      ) : null}

      <div className="outing-list">
        {(data ?? []).map((expense) => (
          <Link
            className="ledger-row"
            to={`/expenses/${expense.id}`}
            key={expense.id}
          >
            <div className="row-main">
              <p className="row-title">{expense.description}</p>
              <p className="row-sub">
                {formatDate(expense.expenseDate)} · {expense.payerName} paid
              </p>
            </div>
            <div className="ledger-actions">
              <p className="amount">{formatPeso(expense.totalCentavos)}</p>
              <p className="row-sub">Your share {formatPeso(expense.myShareCentavos)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
