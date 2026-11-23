import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatPeso } from "@/domain/money/format";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";
import { claimExpenseShare, expenseSharePreview } from "@/features/share/api";

export function JoinExpensePage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selected, setSelected] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  usePageTitle("Join expense");

  const previewQuery = useQuery({
    queryKey: ["expense-share-preview", token],
    queryFn: () => expenseSharePreview(token as string),
    enabled: Boolean(token),
    retry: false
  });

  const preview = previewQuery.data;

  useEffect(() => {
    if (preview && preview.unclaimed.length === 1) {
      setSelected(preview.unclaimed[0].personId);
    }
  }, [preview]);

  async function join() {
    if (!token || !preview || !selected) return;
    setJoining(true);
    setClaimError(null);
    try {
      const result = await claimExpenseShare(token, selected);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["people"] }),
        queryClient.invalidateQueries({ queryKey: ["expenses"] }),
        queryClient.invalidateQueries({ queryKey: ["ledger"] }),
        queryClient.invalidateQueries({ queryKey: ["activity", "recent"] }),
        queryClient.invalidateQueries({ queryKey: ["expense", result.expenseId] })
      ]);
      navigate(`/expenses/${result.expenseId}`, { replace: true });
    } catch (caught) {
      setClaimError(getErrorMessage(caught, "Could not join this expense"));
      void previewQuery.refetch();
      setJoining(false);
    }
  }

  const selectedName =
    preview?.unclaimed.find((person) => person.personId === selected)?.displayName ?? "";

  if (previewQuery.isLoading) {
    return (
      <div className="page">
        <h1 className="page-title">Join expense</h1>
        <p className="panel-copy">Opening the link.</p>
      </div>
    );
  }

  if (previewQuery.error || !preview) {
    return (
      <div className="page">
        <h1 className="page-title">Join expense</h1>
        <p className="form-error" role="alert">
          {getErrorMessage(previewQuery.error, "This link is no longer available.")}
        </p>
        <Link className="text-action" to="/">
          <Icon name="chevron-left" />
          Back to Home
        </Link>
      </div>
    );
  }

  if (preview.alreadyParticipant) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-title">You're already on it.</h1>
          <p className="page-sub">{preview.description}</p>
        </header>
        <Link className="primary-action" to={`/expenses/${preview.expenseId}`}>
          <Icon name="arrow-right" />
          Open the expense
        </Link>
      </div>
    );
  }

  if (preview.unclaimed.length === 0) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-title">Everyone has joined.</h1>
          <p className="page-sub">
            There is no open name on this expense for you. Ask the payer to add you.
          </p>
        </header>
        <Link className="text-action" to="/">
          <Icon name="chevron-left" />
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Join expense</h1>
        <p className="page-sub">Choose your name to see your share and settle up.</p>
      </header>

      <section className="ticket">
        <p className="ticket-label">Shared expense</p>
        <p className="ticket-figure">{formatPeso(preview.totalCentavos)}</p>
        <p className="ticket-copy">
          {preview.description} · {formatDate(preview.expenseDate)} · {preview.payerName} paid
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Which one is you?</h2>
        </div>
        <div className="person-list">
          {preview.unclaimed.map((person) => {
            const isOn = selected === person.personId;
            return (
              <button
                key={person.personId}
                className={`person${isOn ? " is-on" : ""}`}
                type="button"
                onClick={() => setSelected(person.personId)}
                aria-pressed={isOn}
              >
                <span className="member-initials">
                  {person.displayName.slice(0, 2).toUpperCase()}
                </span>
                <span>{person.displayName}</span>
                {isOn ? <Icon name="check" size={14} /> : null}
              </button>
            );
          })}
        </div>
        <p className="panel-copy">
          Your items and share were recorded by {preview.payerName}. Joining just links this
          name to your Google account.
        </p>
        {claimError ? (
          <p className="form-error" role="alert">
            {claimError}
          </p>
        ) : null}
        <button
          className="primary-action"
          type="button"
          onClick={() => void join()}
          disabled={!selected || joining}
        >
          <Icon name="check" />
          {joining ? "Joining." : selectedName ? `Join as ${selectedName}` : "Choose your name"}
        </button>
      </section>

      <Link className="text-action" to="/">
        <Icon name="chevron-left" />
        Not you? Back to Home
      </Link>
    </div>
  );
}
