import { useCallback, useMemo, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPeso, parsePesoToCentavos } from "@/domain/money/format";
import type { LedgerTransfer } from "@/domain/ledger/computeLedger";
import { useGroup } from "@/features/groups/groupContext";
import { decideSettlement, recordSettlement, voidSettlement } from "@/features/ledger/api";
import type { Settlement } from "@/features/ledger/types";
import { useLedgerView } from "@/features/ledger/useLedger";
import { PaymentQrImage } from "@/features/payments/PaymentQrImage";
import { Icon } from "@/ui/primitives/Icon";
import { Sheet } from "@/ui/primitives/Sheet";
import { todayInManila } from "@/features/outings/api";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { initials } from "@/lib/names";

const statusLabels: Record<Settlement["status"], string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  declined: "Declined",
  void: "Void"
};

export function LedgerPage() {
  const { profile, group, adults } = useGroup();
  const queryClient = useQueryClient();
  const { data, ledger, isLoading, error } = useLedgerView(group?.id, adults);

  const [showForm, setShowForm] = useState(false);
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInManila());
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [qrTarget, setQrTarget] = useState<LedgerTransfer | null>(null);
  const closeQr = useCallback(() => setQrTarget(null), []);

  usePageTitle("Ledger");

  const isOwner = group?.owner_id === profile?.id;
  const activeAdults = adults.filter((adult) => adult.status === "active");
  const myAdult = activeAdults.find((adult) => adult.profile_id === profile?.id) ?? null;

  const adultById = useMemo(() => new Map(adults.map((adult) => [adult.id, adult])), [adults]);

  function nameOf(adultId: string) {
    return adultById.get(adultId)?.display_name ?? "Removed adult";
  }

  function colorOf(adultId: string) {
    return adultById.get(adultId)?.color ?? "var(--platform-muted)";
  }

  function qrFor(adultId: string) {
    const adult = adultById.get(adultId);
    if (!adult?.payment_qr_path) return null;
    return {
      path: adult.payment_qr_path,
      label: adult.payment_qr_label,
      name: adult.display_name
    };
  }

  function renderQrHint() {
    if (!toId) return null;

    const qr = qrFor(toId);
    if (!qr) {
      return (
        <p className="panel-copy">
          No payment QR from {nameOf(toId)} yet. Ask them to add one in Settings; you can still
          record the payment.
        </p>
      );
    }

    return (
      <div className="qr-inline">
        <PaymentQrImage path={qr.path} name={qr.name} compact />
        <p className="panel-copy">Scan with your banking app{qr.label ? ` · ${qr.label}` : ""}.</p>
      </div>
    );
  }

  function canRecordAs(adultId: string) {
    return isOwner || adultId === myAdult?.id;
  }

  const myNet = myAdult && ledger ? (ledger.netByAdult[myAdult.id] ?? 0) : 0;
  const settlements = data?.settlements ?? [];
  const pendingIncoming = settlements.filter(
    (settlement) => settlement.status === "pending" && settlement.to_adult_id === myAdult?.id
  );
  const pendingOutgoing = settlements.filter(
    (settlement) => settlement.status === "pending" && settlement.from_adult_id === myAdult?.id
  );
  const visibleHistory = settlements.filter(
    (settlement) => !(settlement.status === "pending" && settlement.to_adult_id === myAdult?.id)
  );
  const balanceRows = adults.filter((adult) => {
    const net = ledger?.netByAdult[adult.id] ?? 0;
    return adult.status !== "removed" || net !== 0;
  });
  const qrTargetInfo = qrTarget ? qrFor(qrTarget.toAdultId) : null;

  async function refresh() {
    if (!group) return;
    await queryClient.invalidateQueries({ queryKey: ["ledger", group.id] });
  }

  function openRecord(prefill?: LedgerTransfer) {
    setShowForm(true);
    setFormError(null);
    setNotice(null);
    setDecliningId(null);
    setVoidingId(null);
    setQrTarget(null);
    setFromId(prefill?.fromAdultId ?? myAdult?.id ?? activeAdults[0]?.id ?? "");
    setToId(prefill?.toAdultId ?? "");
    setAmount(prefill ? (prefill.amountCentavos / 100).toFixed(2) : "");
    setDate(todayInManila());
    setNote("");
  }

  function closeRecord() {
    setShowForm(false);
    setFormError(null);
  }

  async function handleRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!group) return;
    setFormError(null);
    setNotice(null);

    try {
      if (!fromId || !toId) throw new Error("Choose who paid and who received it");
      if (fromId === toId) throw new Error("Choose two different adults");
      const centavos = parsePesoToCentavos(amount);
      if (centavos <= 0) throw new Error("Enter an amount greater than zero");

      setSaving(true);
      await recordSettlement({
        groupId: group.id,
        fromAdultId: fromId,
        toAdultId: toId,
        amountCentavos: centavos,
        date,
        note
      });
      await refresh();
      setShowForm(false);
      setNotice(`Recorded ${formatPeso(centavos)}. Waiting for ${nameOf(toId)} to confirm.`);
    } catch (caught) {
      setFormError(getErrorMessage(caught, "Could not record the payment"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDecision(
    settlement: Settlement,
    decision: "confirmed" | "declined",
    declineReason?: string
  ) {
    setActionError(null);
    setNotice(null);
    try {
      setSaving(true);
      await decideSettlement(settlement.id, decision, declineReason);
      await refresh();
      setDecliningId(null);
      setDeclineNote("");
      setNotice(
        decision === "confirmed"
          ? `Confirmed. ${formatPeso(settlement.amount_centavos)} now counts in the ledger.`
          : "Declined. Balances did not change."
      );
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not update the settlement"));
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid(settlement: Settlement) {
    setActionError(null);
    setNotice(null);
    try {
      setSaving(true);
      await voidSettlement(settlement.id);
      await refresh();
      setVoidingId(null);
      setNotice("Voided. The settlement no longer counts.");
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not void the settlement"));
    } finally {
      setSaving(false);
    }
  }

  function renderSettlementRow(settlement: Settlement) {
    const incoming = settlement.to_adult_id === myAdult?.id;
    const outgoing = settlement.from_adult_id === myAdult?.id;
    const title = incoming
      ? `${nameOf(settlement.from_adult_id)} paid you`
      : outgoing
        ? `You paid ${nameOf(settlement.to_adult_id)}`
        : `${nameOf(settlement.from_adult_id)} paid ${nameOf(settlement.to_adult_id)}`;
    const detail = [formatDate(settlement.date), settlement.note || "No note"]
      .filter(Boolean)
      .join(" · ");

    return (
      <li className="settlement-row" key={settlement.id}>
        <span className="member-initials" style={{ background: colorOf(settlement.from_adult_id) }}>
          {initials(nameOf(settlement.from_adult_id))}
        </span>
        <div className="row-main">
          <span className="row-title">{title}</span>
          <span className="row-sub">{detail}</span>
          {settlement.decline_reason ? (
            <span className="row-sub">Declined: {settlement.decline_reason}</span>
          ) : null}
          {settlement.status === "pending" && outgoing ? (
            <div className="ledger-actions">
              {voidingId === settlement.id ? (
                <>
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => void handleVoid(settlement)}
                    disabled={saving}
                  >
                    <Icon name="trash" />
                    Void payment
                  </button>
                  <button className="text-action" type="button" onClick={() => setVoidingId(null)}>
                    <Icon name="x" />
                    Keep
                  </button>
                </>
              ) : (
                <button
                  className="icon-action is-danger"
                  type="button"
                  aria-label={`Void the payment from you to ${nameOf(settlement.to_adult_id)}`}
                  title="Void payment"
                  onClick={() => setVoidingId(settlement.id)}
                >
                  <Icon name="trash" />
                </button>
              )}
            </div>
          ) : null}
        </div>
        <span className="amount">{formatPeso(settlement.amount_centavos)}</span>
        <span className={`status-chip status-chip--${settlement.status}`}>
          {statusLabels[settlement.status]}
        </span>
      </li>
    );
  }

  return (
    <div className="page page--list">
      <header className="page-head">
        <h1 className="page-title">Ledger</h1>
        <p className="page-sub">Balances carry over until you settle.</p>
      </header>

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

      {notice ? (
        <p className="form-notice" role="status">
          {notice}
        </p>
      ) : null}

      <section
        className={`panel balance-strip ${!isLoading && myNet < 0 ? "is-negative" : ""}`}
      >
        <div>
          <span className="ticket-label">
            {isLoading
              ? "Your position"
              : myNet < 0
                ? "You owe"
                : myNet > 0
                  ? "You are owed"
                  : "Your position"}
          </span>
          <div className="balance-strip-figure">
            {isLoading ? "—" : formatPeso(Math.abs(myNet))}
          </div>
        </div>
        <div className="balance-strip-copy">
          <p className="panel-copy">
            {isLoading
              ? "Loading the shared ledger…"
              : myNet < 0
                ? `Settle ${formatPeso(Math.abs(myNet))} with the table when you are ready.`
                : myNet > 0
                  ? "Waiting for the table to settle."
                  : "All square. Nothing to settle."}
          </p>
          {pendingIncoming.length > 0 ? (
            <p className="panel-copy">
              {pendingIncoming.length}{" "}
              {pendingIncoming.length === 1 ? "payment needs" : "payments need"} your confirmation.
            </p>
          ) : null}
        </div>
      </section>

      <div className="ledger-grid">
        <section className="panel">
          <h2 className="panel-title">Balances</h2>
          {isLoading ? <p className="panel-copy">Loading balances…</p> : null}
          {!isLoading && balanceRows.every((adult) => (ledger?.netByAdult[adult.id] ?? 0) === 0) ? (
            <p className="panel-copy">Nothing outstanding. The table is even.</p>
          ) : null}
          <ul className="ledger-rows" role="list">
            {balanceRows.map((adult) => {
              const net = ledger?.netByAdult[adult.id] ?? 0;
              return (
                <li className="ledger-row" key={adult.id}>
                  <span className="member-initials" style={{ background: adult.color }}>
                    {initials(adult.display_name)}
                  </span>
                  <span className="ledger-name ledger-name--stacked">
                    <span className="ledger-name-line">
                      {adult.display_name}
                      {adult.id === myAdult?.id ? <span className="ledger-you">You</span> : null}
                      {adult.status === "removed" ? (
                        <span className="member-status">Removed</span>
                      ) : null}
                    </span>
                    <span className={`ledger-sub ${net < 0 ? "owes" : net > 0 ? "is-owed" : ""}`}>
                      {net < 0 ? "owes" : net > 0 ? "is owed" : "even"}
                    </span>
                  </span>
                  <span className={`ledger-net ${net < 0 ? "owes" : net > 0 ? "is-owed" : ""}`}>
                    {formatPeso(Math.abs(net))}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel">
          <h2 className="panel-title">Who owes whom</h2>
          {isLoading ? <p className="panel-copy">Loading payments…</p> : null}
          {!isLoading && (ledger?.transfers.length ?? 0) === 0 ? (
            <p className="panel-copy">Everyone is square.</p>
          ) : null}
          <ul className="ledger-rows" role="list">
            {ledger?.transfers.map((transfer) => {
              const mine = transfer.fromAdultId === myAdult?.id;
              return (
                <li
                  className="ledger-row"
                  key={`${transfer.fromAdultId}-${transfer.toAdultId}`}
                >
                  <span
                    className="member-initials"
                    style={{ background: colorOf(transfer.fromAdultId) }}
                  >
                    {initials(nameOf(transfer.fromAdultId))}
                  </span>
                  <Icon name="arrow-right" size={16} className="ledger-arrow" />
                  <span
                    className="member-initials"
                    style={{ background: colorOf(transfer.toAdultId) }}
                  >
                    {initials(nameOf(transfer.toAdultId))}
                  </span>
                  <span className="row-main">
                    <span className="row-title">{nameOf(transfer.toAdultId)}</span>
                    <span className="row-sub">
                      {mine ? "Your payment" : `From ${nameOf(transfer.fromAdultId)}`}
                    </span>
                  </span>
                  <span className="amount">{formatPeso(transfer.amountCentavos)}</span>
                  {qrFor(transfer.toAdultId) ? (
                    <button
                      className="icon-action"
                      type="button"
                      aria-label={`Show the payment QR for ${nameOf(transfer.toAdultId)}`}
                      title="Payment QR"
                      onClick={() => {
                        setQrTarget(transfer);
                        setNotice(null);
                      }}
                    >
                      <Icon name="qr" />
                    </button>
                  ) : null}
                  {canRecordAs(transfer.fromAdultId) ? (
                    <button
                      className="icon-action"
                      type="button"
                      aria-label={`Record a payment from ${nameOf(
                        transfer.fromAdultId
                      )} to ${nameOf(transfer.toAdultId)}`}
                      title="Record payment"
                      onClick={() => openRecord(transfer)}
                    >
                      <Icon name="plus" />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <Sheet
        open={Boolean(qrTarget && qrTargetInfo)}
        onClose={closeQr}
        title={qrTargetInfo?.name ?? "Scan to pay"}
      >
        <span className="panel-label">Scan to pay</span>
        {qrTarget && qrTargetInfo ? (
          <>
            <p className="panel-copy">
              {formatPeso(qrTarget.amountCentavos)}
              {qrTargetInfo.label ? ` · ${qrTargetInfo.label}` : ""}
            </p>
            <div className="qr-preview">
              <PaymentQrImage path={qrTargetInfo.path} name={qrTargetInfo.name} />
            </div>
            <p className="panel-copy">
              Scan with your banking app. The QR is display-only; record the payment when done.
            </p>
            <div className="form-actions">
              <button className="secondary-action" type="button" onClick={closeQr}>
                <Icon name="x" />
                Close
              </button>
              <button
                className="primary-action"
                type="button"
                onClick={() => {
                  const target = qrTarget;
                  closeQr();
                  openRecord(target);
                }}
              >
                <Icon name="plus" />
                Record payment
              </button>
            </div>
          </>
        ) : null}
      </Sheet>

      {pendingIncoming.length > 0 ? (
        <section className="panel">
          <h2 className="panel-title">Confirm payments</h2>
          <p className="panel-copy">Only confirmed payments change balances.</p>
          <ul className="ledger-rows" role="list">
            {pendingIncoming.map((settlement) => (
              <li className="settlement-row settlement-row--stacked" key={settlement.id}>
              <span
                className="member-initials"
                style={{ background: colorOf(settlement.from_adult_id) }}
              >
                {initials(nameOf(settlement.from_adult_id))}
              </span>
              <div className="row-main">
                <div className="settlement-head">
                  <span className="row-title">{nameOf(settlement.from_adult_id)} paid you</span>
                  <span className="amount">{formatPeso(settlement.amount_centavos)}</span>
                  <span className="status-chip status-chip--pending">Pending</span>
                </div>
                <span className="row-sub">
                  {[formatDate(settlement.date), settlement.note || "No note"].join(" · ")}
                </span>
                <div className="ledger-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => void handleDecision(settlement, "confirmed")}
                    disabled={saving}
                  >
                    <Icon name="check" />
                    Confirm
                  </button>
                  <button
                    className="text-action is-danger"
                    type="button"
                    onClick={() => {
                      setDecliningId(decliningId === settlement.id ? null : settlement.id);
                      setDeclineNote("");
                    }}
                  >
                    <Icon name="x" />
                    Decline
                  </button>
                </div>
                {decliningId === settlement.id ? (
                  <form
                    className="ledger-decline"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void handleDecision(settlement, "declined", declineNote);
                    }}
                  >
                    <label className="field" htmlFor={`decline-note-${settlement.id}`}>
                      <span>Note (required)</span>
                      <input
                        id={`decline-note-${settlement.id}`}
                        name="declineNote"
                        type="text"
                        value={declineNote}
                        onChange={(event) => setDeclineNote(event.target.value)}
                        placeholder="Why is this wrong?"
                        maxLength={500}
                        required
                      />
                    </label>
                    <button className="secondary-action" type="submit" disabled={saving}>
                      <Icon name="x" />
                      Decline payment
                    </button>
                  </form>
                ) : null}
              </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <h2 className="panel-title">Payment history</h2>
        {isLoading ? <p className="panel-copy">Loading payments…</p> : null}
        {!isLoading && visibleHistory.length === 0 ? (
          <p className="panel-copy">No settlements yet. Record one when someone pays.</p>
        ) : null}
        {pendingOutgoing.length > 0 ? (
          <p className="panel-copy">
            {pendingOutgoing.length} {pendingOutgoing.length === 1 ? "payment is" : "payments are"}{" "}
            waiting for the recipient to confirm.
          </p>
        ) : null}
        <ul className="ledger-rows" role="list">
          {visibleHistory.slice(0, 20).map((settlement) => renderSettlementRow(settlement))}
        </ul>
        <button className="secondary-action" type="button" onClick={() => openRecord()}>
          <Icon name="plus" />
          Record payment
        </button>
      </section>

      {showForm ? (
        <form className="panel auth-form" onSubmit={(event) => void handleRecord(event)}>
          <h2 className="panel-title">Record a payment</h2>
          <p className="panel-copy">
            The recipient confirms before anything changes. Partial payments are fine.
          </p>

          <label className="field" htmlFor="settlement-from">
            <span>From</span>
            {isOwner ? (
              <select
                id="settlement-from"
                name="from"
                value={fromId}
                onChange={(event) => {
                  setFromId(event.target.value);
                  if (event.target.value === toId) setToId("");
                }}
                required
              >
                {activeAdults.map((adult) => (
                  <option key={adult.id} value={adult.id}>
                    {adult.display_name}
                    {adult.id === myAdult?.id ? " (you)" : ""}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="settlement-from"
                name="from"
                type="text"
                value={myAdult?.display_name ?? "You"}
                readOnly
              />
            )}
          </label>

          <label className="field" htmlFor="settlement-to">
            <span>To</span>
            <select
              id="settlement-to"
              name="to"
              value={toId}
              onChange={(event) => setToId(event.target.value)}
              required
            >
              <option value="">Choose a recipient</option>
              {activeAdults
                .filter((adult) => adult.id !== fromId)
                .map((adult) => (
                  <option key={adult.id} value={adult.id}>
                    {adult.display_name}
                  </option>
                ))}
            </select>
          </label>

          {renderQrHint()}

          <div className="field-pair">
            <label className="field" htmlFor="settlement-amount">
              <span>Amount</span>
              <input
                id="settlement-amount"
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder="0.00"
                required
              />
            </label>
            <label className="field" htmlFor="settlement-date">
              <span>Date</span>
              <input
                id="settlement-date"
                name="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
          </div>

          <label className="field" htmlFor="settlement-note">
            <span>Note (optional)</span>
            <input
              id="settlement-note"
              name="note"
              type="text"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Cash, GCash, dinner"
              maxLength={500}
            />
          </label>

          {formError ? (
            <p className="form-error" role="alert" id="settlement-error">
              {formError}
            </p>
          ) : null}

          <div className="form-actions">
            <button className="secondary-action" type="button" onClick={closeRecord}>
              <Icon name="x" />
              Cancel
            </button>
            <button className="primary-action" type="submit" disabled={saving}>
              <Icon name="plus" />
              {saving ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
