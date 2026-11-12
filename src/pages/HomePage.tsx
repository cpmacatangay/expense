import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { formatPeso } from "@/domain/money/format";
import { useAuth } from "@/features/auth/authContext";
import { listLocalDrafts, saveLocalDraft } from "@/features/drafts/api";
import { createLocalDraft } from "@/features/drafts/types";
import { useGroup } from "@/features/groups/groupContext";
import { useLedgerView } from "@/features/ledger/useLedger";
import { createOuting, getOuting, listOutings, todayInManila } from "@/features/outings/api";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { greetingName, initials } from "@/lib/names";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";
import { ShareBand, type ShareSlice } from "@/ui/primitives/ShareBand";

export function HomePage() {
  const { user } = useAuth();
  const { profile, group, adults } = useGroup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle("Home");

  const { data: outings, isLoading } = useQuery({
    queryKey: ["outings", group?.id],
    queryFn: () => listOutings(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const { data: localDrafts } = useQuery({
    queryKey: ["local-drafts", group?.id, profile?.id],
    queryFn: () => listLocalDrafts(group?.id as string, profile?.id as string),
    enabled: Boolean(group?.id && profile?.id),
    staleTime: 0,
    networkMode: "always"
  });

  const greeting = greetingName(profile, user?.email);
  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");
  const { data: ledgerData, ledger, isLoading: ledgerLoading } = useLedgerView(group?.id, adults);
  const myAdult = activeAdults.find((adult) => adult.profile_id === profile?.id) ?? null;
  const myNet = myAdult && ledger ? (ledger.netByAdult[myAdult.id] ?? 0) : 0;
  const pendingIncoming =
    ledgerData?.settlements.filter(
      (settlement) => settlement.status === "pending" && settlement.to_adult_id === myAdult?.id
    ).length ?? 0;
  const hasFinalizedOuting = outings?.some((outing) => outing.status === "finalized") ?? false;

  const lastFinalized = useMemo(
    () =>
      [...(outings ?? [])]
        .filter((outing) => outing.status === "finalized")
        .sort((a, b) => b.date.localeCompare(a.date))[0],
    [outings]
  );

  const { data: lastDetail } = useQuery({
    queryKey: ["outing", lastFinalized?.id],
    queryFn: () => getOuting(lastFinalized?.id as string),
    enabled: Boolean(lastFinalized?.id)
  });

  const lastSlices = useMemo<ShareSlice[]>(() => {
    const byId = new Map(adults.map((adult) => [adult.id, adult.display_name]));
    const order = new Map(adults.map((adult, index) => [adult.id, index]));
    return [...(lastDetail?.shares ?? [])]
      .filter((share) => share.total_centavos > 0)
      .sort(
        (a, b) =>
          (order.get(a.adult_id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.adult_id) ?? Number.MAX_SAFE_INTEGER)
      )
      .map((share) => ({
        id: share.adult_id,
        name: byId.get(share.adult_id) ?? "Adult",
        amountCentavos: share.total_centavos
      }));
  }, [lastDetail, adults]);

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

  const balanceWord = ledgerLoading
    ? "Your balance"
    : myNet < 0
      ? "You owe"
      : myNet > 0
        ? "You are owed"
        : "Your balance";
  const balanceCopy = ledgerLoading
    ? "Loading the ledger…"
    : myNet < 0
      ? `Settle ${formatPeso(Math.abs(myNet))} with the table when you are ready.`
      : myNet > 0
        ? "Waiting for the table to settle."
        : hasFinalizedOuting
          ? "All square."
          : "No finalized outings yet.";

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

      <div className="home-grid">
        <div className="home-lead">
          <section
            className={`ticket balance-anchor ${!ledgerLoading && myNet < 0 ? "is-negative" : ""}`}
            aria-label="Your balance"
          >
            <span className="ticket-label">{balanceWord}</span>
            <div className="ticket-figure">{ledgerLoading ? "—" : formatPeso(Math.abs(myNet))}</div>
            <p className="ticket-copy">{balanceCopy}</p>
            {pendingIncoming > 0 ? (
              <p className="ticket-copy">
                {pendingIncoming} {pendingIncoming === 1 ? "payment needs" : "payments need"} your
                confirmation.
              </p>
            ) : null}

            {lastSlices.length > 1 ? (
              <>
                <div className="ticket-rule" />
                <ShareBand
                  slices={lastSlices}
                  youId={myAdult?.id}
                  label={`Last meal · ${lastFinalized?.place || "Untitled outing"}`}
                />
              </>
            ) : null}

            <Link className="text-link" to="/ledger">
              Open ledger
              <Icon name="arrow-right" />
            </Link>
          </section>

          <button
            className="primary-action"
            type="button"
            onClick={() => void handleNewOuting()}
            disabled={creating || !online}
            title={!online ? "Connect to start a shared outing" : undefined}
          >
            <Icon name="plus" />
            {creating ? "Starting…" : "New outing"}
          </button>
          <button
            className="text-action home-private-draft"
            type="button"
            onClick={() => void handleNewLocalDraft()}
            disabled={creating}
          >
            <Icon name="plus" />
            Start a private draft
          </button>
        </div>

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Recent outings</h2>
          <Link className="text-link" to="/history">
            View all
          </Link>
        </div>
        {isLoading ? <p className="panel-copy">Loading outings…</p> : null}
        {!isLoading && outings?.length === 0 ? (
          <p className="panel-copy">No outings yet. Start the first shared meal.</p>
        ) : null}
        <ul className="outing-list" role="list">
          {outings?.slice(0, 4).map((outing) => {
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
              <li key={outing.id}>
                <Link className="outing-link" to={`/outings/${outing.id}`}>
                  <span>
                    <span className="row-title">{outing.place || "Untitled outing"}</span>
                    <span className="row-sub">
                      {formatDate(outing.date)}
                      {payer ? ` · ${payer.display_name}` : ""}
                    </span>
                  </span>
                  {outing.status === "finalized" ? (
                    <span className="amount">{formatPeso(outing.total_centavos)}</span>
                  ) : (
                    <span className="status-chip status-chip--pending">{draftLabel}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
      </div>

      {localDrafts && localDrafts.length > 0 ? (
        <section className="panel">
          <h2 className="panel-title">Private drafts</h2>
          <p className="panel-copy">
            Saved on this device. Publish or share them when you are connected.
          </p>
          <ul className="outing-list" role="list">
            {localDrafts.map((draft) => {
              const total = draft.items.reduce(
                (sum, item) => sum + item.quantity * item.unitAmountCentavos,
                0
              );
              return (
                <li key={draft.id}>
                  <Link className="outing-link" to={`/drafts/${draft.id}`}>
                    <span>
                      <span className="row-title">{draft.place || "Untitled draft"}</span>
                      <span className="row-sub">
                        {formatDate(draft.date)} · {draft.items.length}{" "}
                        {draft.items.length === 1 ? "item" : "items"} · saved locally
                      </span>
                    </span>
                    <span className="amount">{formatPeso(total)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <div className="section-head">
          <h2 className="panel-title">Your table</h2>
          <Link className="text-link" to="/settings">
            Manage
          </Link>
        </div>
        <ul className="ledger-rows" role="list">
          {adults
            .filter((adult) => adult.status !== "removed")
            .map((adult) => {
              const net = ledger?.netByAdult[adult.id] ?? 0;
              const pending = adult.status === "pending";
              return (
                <li className="ledger-row" key={adult.id}>
                  <span className="member-initials" style={{ background: adult.color }}>
                    {initials(adult.display_name)}
                  </span>
                  <span className="ledger-name ledger-name--stacked">
                    <span className="ledger-name-line">
                      {adult.display_name}
                      {adult.id === myAdult?.id ? <span className="ledger-you">You</span> : null}
                      {pending ? <span className="member-status">Pending</span> : null}
                    </span>
                    <span
                      className={`ledger-sub ${
                        ledgerLoading || pending ? "" : net < 0 ? "owes" : net > 0 ? "is-owed" : ""
                      }`}
                    >
                      {pending
                        ? "No balance yet"
                        : ledgerLoading
                          ? "—"
                          : net < 0
                            ? "owes"
                            : net > 0
                              ? "is owed"
                              : "even"}
                    </span>
                  </span>
                  {pending ? (
                    <span className="ledger-net">—</span>
                  ) : (
                    <span
                      className={`ledger-net ${
                        ledgerLoading ? "" : net < 0 ? "owes" : net > 0 ? "is-owed" : ""
                      }`}
                    >
                      {ledgerLoading ? "—" : formatPeso(Math.abs(net))}
                    </span>
                  )}
                </li>
              );
            })}
        </ul>
        {pendingAdults.length > 0 ? (
          <p className="panel-copy">
            {pendingAdults.length} {pendingAdults.length === 1 ? "adult is" : "adults are"} still
            pending.
          </p>
        ) : null}
      </section>
    </div>
  );
}
