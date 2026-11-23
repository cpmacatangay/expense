import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPeso } from "@/domain/money/format";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";
import { ExpenseHistory } from "./ExpenseHistory";
import { deleteExpense, expenseDetail } from "./api";

export function ExpenseDetailPage() {
  const { expenseId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: detail, isLoading, error } = useQuery({
    queryKey: ["expense", expenseId],
    queryFn: () => expenseDetail(expenseId as string),
    enabled: Boolean(expenseId)
  });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  usePageTitle(detail?.expense.description ?? "Expense");

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const person of detail?.people ?? []) map.set(person.id, person.displayName);
    return map;
  }, [detail]);

  async function handleDelete() {
    if (!expenseId) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteExpense(expenseId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", "recent"] })
      ]);
      navigate("/expenses", { replace: true });
    } catch (caught) {
      setDeleteError(getErrorMessage(caught, "Could not delete the expense"));
      setDeleting(false);
    }
  }

  if (isLoading) return <p className="panel-copy">Loading the expense.</p>;
  if (error || !detail) {
    return (
      <div className="page">
        <p className="form-error" role="alert">
          {getErrorMessage(error, "Not found")}
        </p>
        <Link className="text-action" to="/expenses">
          <Icon name="chevron-left" />
          Back to all expenses
        </Link>
      </div>
    );
  }

  const payerName = names.get(detail.expense.payerPersonId) ?? "Payer";

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <Link className="text-action" to="/expenses">
            <Icon name="chevron-left" />
            All expenses
          </Link>
          <h1 className="page-title">{detail.expense.description}</h1>
          <p className="page-sub">
            {formatDate(detail.expense.expenseDate)} · {payerName} paid
          </p>
        </div>
        {detail.expense.canEdit ? (
          <Link className="secondary-action" to={`/expenses/${detail.expense.id}/edit`}>
            <Icon name="pencil" />
            Edit
          </Link>
        ) : null}
      </header>

      <section className="ticket">
        <p className="ticket-label">Total</p>
        <p className="ticket-figure">{formatPeso(detail.expense.totalCentavos)}</p>
        <p className="ticket-copy">{payerName} paid for {detail.people.length} people.</p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">People</h2>
        </div>
        <div className="member-list">
          {detail.people.map((person) => (
            <div className="member-row" key={person.id}>
              <div className="row-main">
                <p className="row-title">
                  {person.displayName}
                  {person.isPayer ? " · paid" : ""}
                  {person.isCreator && !person.isPayer ? " · created" : ""}
                </p>
                <p className="row-sub">
                  {person.status === "pending"
                    ? "Invited"
                    : person.status === "former"
                      ? "Former account"
                      : "Active"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Items</h2>
        </div>
        <div className="item-list">
          {detail.items.map((item) => (
            <div className="item-row" key={item.id}>
              <div className="row-main">
                <p className="row-title">{item.name}</p>
                <p className="row-sub">For {names.get(item.assignedPersonId) ?? "someone"}</p>
              </div>
              <p className="amount">{formatPeso(item.amountCentavos)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Shares</h2>
        </div>
        <div className="stack">
          {detail.shares.map((share) => (
            <div className="share-row" key={share.personId}>
              <div>
                <p className="row-title">{names.get(share.personId) ?? "Person"}</p>
                <p className="row-sub">
                  {share.coveredByPersonId
                    ? `Covered by ${names.get(share.coveredByPersonId) ?? "someone"}`
                    : share.coveredCentavos > 0
                      ? `Covers ${formatPeso(share.coveredCentavos)}`
                      : "Own items"}
                </p>
              </div>
              <p className="amount">{formatPeso(share.owedCentavos)}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">History</h2>
        </div>
        <ExpenseHistory events={detail.events} />
      </section>

      {detail.expense.canEdit ? (
        <section className="panel panel--account">
          <h2 className="panel-title">Delete</h2>
          <p className="panel-copy">
            The expense disappears from lists and balances. It cannot be reopened.
          </p>
          {deleteError ? <p className="form-error">{deleteError}</p> : null}
          <div className="form-actions">
            <button
              className="text-action"
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              <Icon name="trash" />
              {deleting ? "Deleting." : confirmDelete ? "Confirm delete" : "Delete expense"}
            </button>
            {confirmDelete ? (
              <button className="text-action" type="button" onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
