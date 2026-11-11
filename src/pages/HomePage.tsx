import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { formatPeso } from "@/domain/money/format";
import { useAuth } from "@/features/auth/authContext";
import { listLocalDrafts, saveLocalDraft } from "@/features/drafts/api";
import { createLocalDraft } from "@/features/drafts/types";
import { useGroup } from "@/features/groups/groupContext";
import { useLedgerView } from "@/features/ledger/useLedger";
import { createOuting, listOutings, todayInManila } from "@/features/outings/api";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { greetingName, initials } from "@/lib/names";

export function HomePage() {
  const { user } = useAuth();
  const { profile, group, adults } = useGroup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: outings, isLoading } = useQuery({
    queryKey: ["outings", group?.id],
    queryFn: () => listOutings(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const { data: localDrafts } = useQuery({
    queryKey: ["local-drafts", group?.id],
    queryFn: () => listLocalDrafts(group?.id as string),
    enabled: Boolean(group?.id),
    staleTime: 0,
    networkMode: "always"
  });

  const greeting = greetingName(profile, user?.email);
  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");
  const { data: ledgerData, ledger } = useLedgerView(group?.id, adults);
  const myAdult =
    activeAdults.find((adult) => adult.profile_id === profile?.id) ?? null;
  const myNet = myAdult && ledger ? (ledger.netByAdult[myAdult.id] ?? 0) : 0;
  const pendingIncoming =
    ledgerData?.settlements.filter(
      (settlement) =>
        settlement.status === "pending" && settlement.to_adult_id === myAdult?.id
    ).length ?? 0;
  const hasFinalizedOuting = outings?.some((outing) => outing.status === "finalized") ?? false;

  async function handleNewOuting() {
    if (!group || !profile) return;
    if (!online) {
      setError("Connect to start a shared outing. You can still start a private draft.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const outing = await createOuting({
        groupId: group.id,
        authorProfileId: profile.id,
        date: todayInManila(),
        presentAdultIds: activeAdults.map((adult) => adult.id)
      });
      await queryClient.invalidateQueries({ queryKey: ["outings", group.id] });
      navigate(`/outings/${outing.id}`);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not start the outing"));
      setCreating(false);
    }
  }

  async function handleNewLocalDraft() {
    if (!group || !profile) return;
    setCreating(true);
    setError(null);
    try {
      const draft = createLocalDraft({
        groupId: group.id,
        authorProfileId: profile.id,
        date: todayInManila(),
        presentAdultIds: activeAdults.map((adult) => adult.id)
      });
      await saveLocalDraft(draft);
      await queryClient.invalidateQueries({ queryKey: ["local-drafts", group.id] });
      navigate(`/drafts/${draft.id}`);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not start the private draft"));
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Hi, {greeting}</h1>
        <p className="page-sub">
          {group?.name ?? "Salo"} · {activeAdults.length} at the table
        </p>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="home-lead">
        <section
          className={`panel balance-anchor ${myNet < 0 ? "is-negative" : ""}`}
          aria-label="Your balance"
        >
          <span className="panel-label">
            {myNet < 0 ? "You owe" : myNet > 0 ? "You are owed" : "Your balance"}
          </span>
          <div className="balance-amount">{formatPeso(Math.abs(myNet))}</div>
          <p className="panel-copy">
            {myNet < 0
              ? `Settle ${formatPeso(Math.abs(myNet))} with the table when you are ready.`
              : myNet > 0
                ? "Waiting for the table to settle."
                : hasFinalizedOuting
                  ? "All square."
                  : "No finalized outings yet."}
          </p>
          {pendingIncoming > 0 ? (
            <p className="panel-copy">
              {pendingIncoming} {pendingIncoming === 1 ? "payment needs" : "payments need"} your
              confirmation.
            </p>
          ) : null}
          <Link className="text-action" to="/ledger">
            Open ledger
          </Link>
        </section>
        <button
          className="primary-action"
          type="button"
          onClick={() => void handleNewOuting()}
          disabled={creating || !online}
          title={!online ? "Connect to start a shared outing" : undefined}
        >
          {creating ? "Starting…" : "New outing"}
        </button>
        <button
          className="text-action home-private-draft"
          type="button"
          onClick={() => void handleNewLocalDraft()}
          disabled={creating}
        >
          Start a private draft
        </button>
      </div>

      <section className="panel">
        <span className="panel-label">Outings</span>
        <h2 className="panel-title">Recent outings</h2>
        {isLoading ? <p className="panel-copy">Loading outings…</p> : null}
        {!isLoading && outings?.length === 0 ? (
          <p className="panel-copy">No outings yet. Start the first shared meal.</p>
        ) : null}
        <div className="outing-list">
          {outings?.map((outing) => {
            const payer = outing.payer_adult_id
              ? adults.find((adult) => adult.id === outing.payer_adult_id)
              : null;
            const draftLabel =
              outing.status === "private_draft"
                ? "Private"
                : outing.status === "reopened"
                  ? "Reopened"
                  : "Draft";

            return (
              <Link className="outing-link" key={outing.id} to={`/outings/${outing.id}`}>
                <span>
                  <strong>{outing.place || "Untitled outing"}</strong>
                  <span className="row-sub">
                    {formatDate(outing.date)}
                    {payer ? ` · Paid by ${payer.display_name}` : ""}
                  </span>
                </span>
                {outing.status === "finalized" ? (
                  <span className="amount">{formatPeso(outing.total_centavos)}</span>
                ) : (
                  <span className="status-chip status-chip--pending">{draftLabel}</span>
                )}
              </Link>
            );
          })}
        </div>
        <Link className="text-action" to="/history">
          Full history
        </Link>
      </section>

      {localDrafts && localDrafts.length > 0 ? (
        <section className="panel">
          <span className="panel-label">Private drafts</span>
          <h2 className="panel-title">On this device</h2>
          <p className="panel-copy">
            Saved locally. Publish or share them when you are connected.
          </p>
          <div className="outing-list">
            {localDrafts.map((draft) => {
              const total = draft.items.reduce(
                (sum, item) => sum + item.quantity * item.unitAmountCentavos,
                0
              );
              return (
                <Link className="outing-link" key={draft.id} to={`/drafts/${draft.id}`}>
                  <span>
                    <strong>{draft.place || "Untitled draft"}</strong>
                    <span className="row-sub">
                      {formatDate(draft.date)} · {draft.items.length}{" "}
                      {draft.items.length === 1 ? "item" : "items"} · saved locally
                    </span>
                  </span>
                  <span className="amount">{formatPeso(total)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="panel" aria-label="Your table">
        <span className="panel-label">Your table</span>
        <div className="member-strip">
          {adults
            .filter((adult) => adult.status !== "removed")
            .map((adult) => (
              <span className="member" key={adult.id}>
                <span className="member-initials" style={{ background: adult.color }}>
                  {initials(adult.display_name)}
                </span>
                <span className="member-name">{adult.display_name}</span>
                {adult.status === "pending" ? <span className="member-status">Pending</span> : null}
              </span>
            ))}
        </div>
        {pendingAdults.length > 0 ? (
          <p className="panel-copy">
            {pendingAdults.length} {pendingAdults.length === 1 ? "adult is" : "adults are"} still
            pending.
          </p>
        ) : null}
        <Link className="text-action" to="/settings">
          Invite adults and add students
        </Link>
      </section>
    </div>
  );
}
