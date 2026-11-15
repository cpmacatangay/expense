import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { formatPeso } from "@/domain/money/format";
import { useAuth } from "@/features/auth/authContext";
import { FirstRunPanel } from "@/features/groups/FirstRunPanel";
import { useGroup } from "@/features/groups/groupContext";
import { useLedgerView } from "@/features/ledger/useLedger";
import { createOuting, getOuting, listOutings, todayInManila } from "@/features/outings/api";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { greetingName } from "@/lib/names";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";
import { ShareBand, type ShareSlice } from "@/ui/primitives/ShareBand";

export function HomePage() {
  const { user } = useAuth();
  const { profile, group, groups, adults } = useGroup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle("Home");

  const {
    data: outings,
    isLoading,
    error: outingsError,
    refetch: refetchOutings
  } = useQuery({
    queryKey: ["outings", group?.id],
    queryFn: () => listOutings(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const greeting = greetingName(profile, user?.email);
  const activeAdults = adults.filter((adult) => adult.status === "active");
  const {
    data: ledgerData,
    ledger,
    isLoading: ledgerLoading,
    error: ledgerError,
    refetch: refetchLedger
  } = useLedgerView(group?.id, adults);
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

  if (groups.length === 0) {
    return <FirstRunPanel />;
  }

  async function handleNewExpense() {
    if (!group || !profile) return;
    if (!online) {
      setError("Connect to start an expense.");
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
      setError(getErrorMessage(caught, "Could not start the expense"));
      setCreating(false);
    }
  }

  const balanceWord = ledgerError
    ? "Balance unavailable"
    : ledgerLoading
      ? "Your balance"
      : myNet < 0
        ? "You owe"
        : myNet > 0
          ? "You are owed"
          : "Your balance";
  const balanceCopy = ledgerError
    ? "Try again when you are connected."
    : ledgerLoading
      ? "Loading the ledger…"
      : myNet < 0
        ? `Settle ${formatPeso(Math.abs(myNet))} with the table when you are ready.`
        : myNet > 0
          ? "Waiting for the table to settle."
          : hasFinalizedOuting
            ? "All square."
            : "No finalized expenses yet.";

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Hi, {greeting}</h1>
        <p className="page-sub">{activeAdults.length} at the table</p>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {outingsError || ledgerError ? (
        <div className="error-row">
          <p className="form-error" role="alert">
            {getErrorMessage(
              outingsError ?? ledgerError,
              "Could not load this table. Try again."
            )}
          </p>
          <button
            className="text-action"
            type="button"
            onClick={() => {
              if (outingsError) void refetchOutings();
              if (ledgerError) void refetchLedger();
            }}
          >
            <Icon name="restore" />
            Try again
          </button>
        </div>
      ) : null}

      <div className="home-grid">
        <div className="home-lead">
          <section
            className={`ticket balance-anchor ${!ledgerLoading && myNet < 0 ? "is-negative" : ""}`}
            aria-label="Your balance"
          >
            <span className="ticket-label">{balanceWord}</span>
            <div className="ticket-figure">
              {ledgerLoading || ledgerError ? "—" : formatPeso(Math.abs(myNet))}
            </div>
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
                  label={`Last expense · ${lastFinalized?.place || "Untitled expense"}`}
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
            onClick={() => void handleNewExpense()}
            disabled={creating || !online}
            title={!online ? "Connect to start an expense" : undefined}
          >
            <Icon name="plus" />
            {creating ? "Starting…" : "New expense"}
          </button>
        </div>

        <section className="panel">
          <div className="section-head">
            <h2 className="panel-title">Recent expenses</h2>
            <Link className="text-link" to="/expenses">
              View all
            </Link>
          </div>
          {isLoading ? <p className="panel-copy">Loading expenses…</p> : null}
          {!isLoading && !outingsError && outings?.length === 0 ? (
            <p className="panel-copy">No expenses yet. Start the first one.</p>
          ) : null}
          <ul className="outing-list" role="list">
            {outings?.slice(0, 4).map((outing) => {
              const payer = outing.payer_adult_id
                ? adults.find((adult) => adult.id === outing.payer_adult_id)
                : null;
              const draftLabel = outing.status === "reopened" ? "Reopened" : "Draft";

              return (
                <li key={outing.id}>
                  <Link className="outing-link" to={`/outings/${outing.id}`}>
                    <span>
                      <span className="row-title">{outing.place || "Untitled expense"}</span>
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
    </div>
  );
}
