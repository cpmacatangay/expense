import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { computeShares } from "@/domain/money/computeShares";
import { formatPeso, parsePesoToCentavos } from "@/domain/money/format";
import { useGroup } from "@/features/groups/groupContext";
import {
  addItem,
  deleteItem,
  finalizeOuting,
  getOuting,
  publishPrivateDraft,
  reopenOuting,
  setAdultPresent,
  setStudentPresent,
  updateOuting
} from "@/features/outings/api";
import { useLedger } from "@/features/ledger/useLedger";
import type { AssignmentType } from "@/features/outings/types";
import { RecapPanel } from "@/features/recap/RecapPanel";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";

export function OutingEditorPage() {
  const { outingId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { group, profile, adults: groupAdults, students: groupStudents } = useGroup();

  const { data, isLoading, error } = useQuery({
    queryKey: ["outing", outingId],
    queryFn: () => getOuting(outingId as string),
    enabled: Boolean(outingId)
  });

  const { data: ledgerData } = useLedger(group?.id);
  const recapShares = useMemo(() => {
    const order = new Map(groupAdults.map((adult, index) => [adult.id, index]));
    return (data?.shares ?? [])
      .map((share) => ({
        adultId: share.adult_id,
        totalCentavos: share.total_centavos
      }))
      .sort(
        (a, b) =>
          (order.get(a.adultId) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.adultId) ?? Number.MAX_SAFE_INTEGER)
      );
  }, [data?.shares, groupAdults]);

  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [payerAdultId, setPayerAdultId] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
  const [finalizeState, setFinalizeState] = useState<"idle" | "saving">("idle");
  const [finalizeMessage, setFinalizeMessage] = useState<{
    kind: "error" | "notice";
    text: string;
  } | null>(null);
  const [showReopen, setShowReopen] = useState(false);
  const [reopenState, setReopenState] = useState<"idle" | "saving">("idle");
  const [publishState, setPublishState] = useState<"idle" | "saving">("idle");
  const [showItemForm, setShowItemForm] = useState(true);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [assignment, setAssignment] = useState<AssignmentType>("shared");
  const [assignedAdultId, setAssignedAdultId] = useState("");
  const [assignedStudentId, setAssignedStudentId] = useState("");

  useEffect(() => {
    if (!data) return;
    setDate(data.outing.date);
    setPlace(data.outing.place ?? "");
    setNotes(data.outing.notes ?? "");
    setPayerAdultId(data.outing.payer_adult_id ?? "");
  }, [data]);

  useEffect(() => {
    if (data?.items.length) setShowItemForm(false);
  }, [data?.items.length]);

  const presentAdultIds = useMemo(
    () => (data?.adults ?? []).filter((row) => row.present).map((row) => row.adult_id),
    [data]
  );

  const myAdultId = groupAdults.find((adult) => adult.profile_id === profile?.id)?.id;

  const defaultCoverAdultId =
    (myAdultId && presentAdultIds.includes(myAdultId) ? myAdultId : presentAdultIds[0]) ?? null;

  const presentStudents = useMemo(
    () =>
      (data?.students ?? [])
        .filter((row) => row.present && row.covering_adult_id)
        .map((row) => ({ id: row.student_id, coveredByAdultId: row.covering_adult_id as string })),
    [data]
  );

  const preview = useMemo(() => {
    if (!data) return null;
    try {
      return computeShares({
        presentAdults: presentAdultIds,
        presentStudents,
        items: data.items.map((item) => ({
          amountCentavos: item.amount_centavos,
          assignmentType: item.assignment_type,
          assignedAdultId: item.assigned_adult_id,
          assignedStudentId: item.assigned_student_id
        })),
        totalMode: "auto"
      });
    } catch {
      return null;
    }
  }, [data, presentAdultIds, presentStudents]);

  const adultOrder = useMemo(
    () => new Map(groupAdults.map((adult, index) => [adult.id, index])),
    [groupAdults]
  );
  const displayShares = useMemo(() => {
    if (!preview) return [];
    return [...preview.shares].sort(
      (a, b) =>
        (adultOrder.get(a.adultId) ?? Number.MAX_SAFE_INTEGER) -
        (adultOrder.get(b.adultId) ?? Number.MAX_SAFE_INTEGER)
    );
  }, [preview, adultOrder]);

  const adultName = (id: string | null) =>
    groupAdults.find((adult) => adult.id === id)?.display_name ?? "Unknown";
  const studentName = (id: string | null) =>
    groupStudents.find((student) => student.id === id)?.name ?? "Unknown";

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["outing", outingId] });
    if (group) await queryClient.invalidateQueries({ queryKey: ["outings", group.id] });
  }

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setSaveState("saving");
    setActionError(null);
    try {
      await updateOuting(data.outing.id, data.outing.version, {
        date,
        place: place.trim() || null,
        notes: notes.trim() || null,
        payer_adult_id: payerAdultId || null
      });
      await refresh();
      setSaveState("saved");
    } catch (caught) {
      setSaveState("idle");
      setActionError(getErrorMessage(caught, "Could not save the outing"));
    }
  }

  async function changePayer(value: string) {
    if (!data) return;
    setPayerAdultId(value);
    setActionError(null);
    try {
      await updateOuting(data.outing.id, data.outing.version, {
        date,
        place: place.trim() || null,
        notes: notes.trim() || null,
        payer_adult_id: value || null
      });
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not save the payer"));
    }
  }

  async function handleFinalize() {
    if (!data) return;
    setFinalizeState("saving");
    setFinalizeMessage(null);
    setActionError(null);
    try {
      await finalizeOuting(data.outing.id, data.outing.version);
      await refresh();
      if (group) await queryClient.invalidateQueries({ queryKey: ["ledger", group.id] });
      setFinalizeMessage({ kind: "notice", text: "Finalized. Shares are now fixed." });
    } catch (caught) {
      setFinalizeMessage({
        kind: "error",
        text: getErrorMessage(caught, "Could not finalize the outing")
      });
    } finally {
      setFinalizeState("idle");
    }
  }

  async function handleReopen() {
    if (!data) return;
    setReopenState("saving");
    setActionError(null);
    try {
      await reopenOuting(data.outing.id, data.outing.version);
      await refresh();
      if (group) await queryClient.invalidateQueries({ queryKey: ["ledger", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["activity", group?.id] });
      setShowReopen(false);
      setFinalizeMessage({
        kind: "notice",
        text: "Reopened. Adjust the items, then finalize again."
      });
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not reopen the outing"));
    } finally {
      setReopenState("idle");
    }
  }

  async function handleUseItemsTotal() {
    if (!data) return;
    setActionError(null);
    try {
      await updateOuting(data.outing.id, data.outing.version, { total_mode: "auto" });
      await refresh();
      setFinalizeMessage({
        kind: "notice",
        text: "The total now follows the items again."
      });
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not change the total mode"));
    }
  }

  async function handlePublishDraft() {
    if (!data) return;
    setPublishState("saving");
    setActionError(null);
    setFinalizeMessage(null);
    try {
      await publishPrivateDraft(data.outing.id, data.outing.version);
      await refresh();
      if (group) {
        await queryClient.invalidateQueries({ queryKey: ["outings", group.id] });
        await queryClient.invalidateQueries({ queryKey: ["ledger", group.id] });
        await queryClient.invalidateQueries({ queryKey: ["activity", group.id] });
      }
      setFinalizeMessage({
        kind: "notice",
        text: "Published. The whole table can see this outing now."
      });
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not publish the draft"));
    } finally {
      setPublishState("idle");
    }
  }

  async function toggleAdult(adultId: string, present: boolean) {
    if (!data) return;
    setActionError(null);
    try {
      await setAdultPresent(data.outing.id, adultId, present);
      if (!present && payerAdultId === adultId) setPayerAdultId("");
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not update attendance"));
    }
  }

  async function toggleStudent(studentId: string, present: boolean) {
    if (!data) return;
    setActionError(null);
    try {
      await setStudentPresent(data.outing.id, studentId, present, defaultCoverAdultId);
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not update the student"));
    }
  }

  async function changeStudentCover(studentId: string, coveringAdultId: string) {
    if (!data) return;
    setActionError(null);
    try {
      await setStudentPresent(data.outing.id, studentId, true, coveringAdultId);
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not update coverage"));
    }
  }

  async function handleAddItem(event: FormEvent) {
    event.preventDefault();
    if (!data) return;
    setActionError(null);
    try {
      const quantity = Math.max(1, Number(itemQty) || 1);
      const unit = parsePesoToCentavos(itemPrice);
      if (assignment === "adult" && !assignedAdultId) throw new Error("Choose an adult");
      if (assignment === "student" && !assignedStudentId) throw new Error("Choose a student");

      await addItem({
        outing_id: data.outing.id,
        name: itemName.trim() || "Item",
        quantity,
        unit_amount_centavos: unit,
        assignment_type: assignment,
        assigned_adult_id: assignment === "adult" ? assignedAdultId : null,
        assigned_student_id: assignment === "student" ? assignedStudentId : null,
        sort_order: data.items.length
      });
      setItemName("");
      setItemQty("1");
      setItemPrice("");
      setAssignment("shared");
      setAssignedAdultId("");
      setAssignedStudentId("");
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not add the item"));
    }
  }

  async function handleDeleteItem(id: string) {
    setActionError(null);
    try {
      await deleteItem(id);
      await refresh();
    } catch (caught) {
      setActionError(getErrorMessage(caught, "Could not delete the item"));
    }
  }

  if (isLoading) {
    return <p className="panel-copy">Loading outing…</p>;
  }

  if (error || !data) {
    return (
      <section className="panel">
        <h2 className="panel-title">Outing not found</h2>
        <p className="panel-copy">{error instanceof Error ? error.message : "Try again."}</p>
        <Link className="primary-action" to="/">
          Back to Home
        </Link>
      </section>
    );
  }

  const isEditable = data.outing.status !== "finalized";
  const isOwner = group?.owner_id === profile?.id;
  const affectedSettlements =
    ledgerData?.settlements.filter(
      (settlement) => settlement.status === "pending" || settlement.status === "confirmed"
    ).length ?? 0;
  const canFinalize =
    isEditable &&
    isOwner &&
    Boolean(payerAdultId) &&
    presentAdultIds.includes(payerAdultId) &&
    presentAdultIds.length >= 2 &&
    finalizeState !== "saving";
  const canPublishDraft =
    data.outing.status === "private_draft" &&
    (isOwner || data.outing.author_profile_id === profile?.id);

  return (
    <div className="page page--editor">
      <div className="editor-head">
        <button className="text-action" type="button" onClick={() => navigate("/")}>
          Back
        </button>
        <header className="page-head">
          <h1 className="page-title">{data.outing.place || "New outing"}</h1>
          <p className="page-sub">
            {formatDate(data.outing.date)} ·{" "}
            {data.outing.status === "private_draft" ? "private draft" : data.outing.status}
          </p>
        </header>
        {isOwner && data.outing.status === "finalized" ? (
          <button
            className="text-action"
            type="button"
            onClick={() => setShowReopen(true)}
          >
            Reopen this outing
          </button>
        ) : null}
      </div>

      {showReopen ? (
        <section className="panel editor-confirm" aria-label="Reopen outing">
          <span className="panel-label">Reopen</span>
          <h2 className="panel-title">Clear the finalized shares?</h2>
          <p className="panel-copy">
            This outing becomes editable again. Its share snapshot is cleared, so it leaves the
            ledger until you finalize it again. The saved total stays fixed.
          </p>
          {affectedSettlements > 0 ? (
            <p className="panel-copy">
              This group has {affectedSettlements} pending or confirmed{" "}
              {affectedSettlements === 1 ? "payment" : "payments"}. They stay as recorded, so the
              ledger will recalculate with the new shares.
            </p>
          ) : null}
          <div className="form-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => setShowReopen(false)}
            >
              Keep finalized
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => void handleReopen()}
              disabled={reopenState === "saving"}
            >
              {reopenState === "saving" ? "Reopening…" : "Reopen outing"}
            </button>
          </div>
        </section>
      ) : null}

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      <form className="panel auth-form" onSubmit={saveDetails} aria-label="Outing details">
        <div className="field-pair">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={!isEditable}
            />
          </label>
          <label className="field">
            <span>Place</span>
            <input
              type="text"
              value={place}
              onChange={(event) => setPlace(event.target.value)}
              placeholder="McDo Il Corso"
              maxLength={120}
              disabled={!isEditable}
            />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Friday dinner"
            maxLength={1000}
            disabled={!isEditable}
          />
        </label>
        <label className="field">
          <span>Paid by</span>
          <select
            value={payerAdultId}
            onChange={(event) => void changePayer(event.target.value)}
            disabled={!isEditable}
          >
            <option value="">Choose a payer</option>
            {groupAdults
              .filter((adult) => adult.status !== "removed" && presentAdultIds.includes(adult.id))
              .map((adult) => (
                <option key={adult.id} value={adult.id}>
                  {adult.display_name}
                </option>
              ))}
          </select>
        </label>
        {isEditable ? (
          <div className="form-actions">
            <button className="text-action" type="submit" disabled={saveState === "saving"}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : "Save details"}
            </button>
          </div>
        ) : null}
      </form>

      <section className="panel">
        <span className="panel-label">Attendance</span>
        <h2 className="panel-title">At the table</h2>
        <div className="attendance-grid">
          {groupAdults
            .filter((adult) => adult.status !== "removed")
            .map((adult) => {
              const present = presentAdultIds.includes(adult.id);
              return (
                <button
                  className={`person${present ? " is-on" : ""}`}
                  key={adult.id}
                  type="button"
                  aria-pressed={present}
                  onClick={() => void toggleAdult(adult.id, !present)}
                  disabled={!isEditable}
                >
                  <span className="member-initials" style={{ background: adult.color }}>
                    {initials(adult.display_name)}
                  </span>
                  <span>{adult.display_name}</span>
                </button>
              );
            })}
        </div>
        {groupStudents.length > 0 ? (
          <div className="student-list">
            {groupStudents.map((student) => {
              const row = data.students.find((item) => item.student_id === student.id);
              const present = Boolean(row?.present);
              return (
                <div className="student-row" key={student.id}>
                  <label className="student-check">
                    <input
                      type="checkbox"
                      checked={present}
                      disabled={!isEditable}
                      onChange={() => void toggleStudent(student.id, !present)}
                    />
                    <span>{student.name}</span>
                  </label>
                  {present ? (
                    <select
                      aria-label={`Cover for ${student.name}`}
                      value={row?.covering_adult_id ?? ""}
                      onChange={(event) => void changeStudentCover(student.id, event.target.value)}
                      disabled={!isEditable}
                    >
                      {groupAdults
                        .filter((adult) => presentAdultIds.includes(adult.id))
                        .map((adult) => (
                          <option key={adult.id} value={adult.id}>
                            {adult.display_name}
                          </option>
                        ))}
                    </select>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="panel-copy">
            No students yet. <Link to="/settings">Add students in Settings.</Link>
          </p>
        )}
      </section>

      <section className="panel">
        <div className="section-head">
          <div>
            <span className="panel-label">Items</span>
            <h2 className="panel-title">The bill</h2>
          </div>
          {isEditable && data.items.length > 0 && !showItemForm ? (
            <button className="text-action" type="button" onClick={() => setShowItemForm(true)}>
              Add item
            </button>
          ) : null}
        </div>

        {data.outing.status === "reopened" ? (
          data.outing.total_mode === "fixed" ? (
            <div className="reopened-note">
              <p className="panel-copy">
                Reopened outings keep the saved total, even when items change.
              </p>
              {isOwner ? (
                <button
                  className="text-action"
                  type="button"
                  onClick={() => void handleUseItemsTotal()}
                >
                  Use items total
                </button>
              ) : null}
            </div>
          ) : (
            <p className="panel-copy">This outing follows the item sum again.</p>
          )
        ) : null}

        <div className="item-list">
          {data.items.map((item) => (
            <div className="item-row" key={item.id}>
              <span className="row-main">
                <span className="row-title">{item.name}</span>
                <span className="row-sub">
                  {item.quantity} × {formatPeso(item.unit_amount_centavos)} ·{" "}
                  {item.assignment_type === "adult"
                    ? adultName(item.assigned_adult_id)
                    : item.assignment_type === "student"
                      ? studentName(item.assigned_student_id)
                      : "Shared"}
                </span>
              </span>
              <span className="amount">{formatPeso(item.amount_centavos)}</span>
              {isEditable ? (
                <button
                  className="text-action"
                  type="button"
                  onClick={() => void handleDeleteItem(item.id)}
                  aria-label={`Delete ${item.name}`}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ))}
          {data.items.length === 0 ? (
            <p className="panel-copy">Add the first item to start the bill.</p>
          ) : null}
        </div>

        {isEditable && (showItemForm || data.items.length === 0) ? (
          <form className="auth-form" onSubmit={handleAddItem}>
            <label className="field">
              <span>Item</span>
              <input
                type="text"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
                placeholder="Shared rice"
                maxLength={120}
                required
              />
            </label>
            <div className="field-pair">
              <label className="field">
                <span>Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={itemQty}
                  onChange={(event) => setItemQty(event.target.value)}
                />
              </label>
              <label className="field">
                <span>Unit price</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={itemPrice}
                  onChange={(event) => setItemPrice(event.target.value)}
                  placeholder="0.00"
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>Who shares it</span>
              <select
                value={assignment}
                onChange={(event) => setAssignment(event.target.value as AssignmentType)}
              >
                <option value="shared">Everyone present</option>
                <option value="adult">One adult</option>
                <option value="student">One student</option>
              </select>
            </label>
            {assignment === "adult" ? (
              <label className="field">
                <span>Adult</span>
                <select
                  value={assignedAdultId}
                  onChange={(event) => setAssignedAdultId(event.target.value)}
                >
                  <option value="">Choose an adult</option>
                  {presentAdultIds.map((id) => (
                    <option key={id} value={id}>
                      {adultName(id)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {assignment === "student" ? (
              <label className="field">
                <span>Student</span>
                <select
                  value={assignedStudentId}
                  onChange={(event) => setAssignedStudentId(event.target.value)}
                >
                  <option value="">Choose a student</option>
                  {presentStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {studentName(student.id)}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <div className="form-actions">
              <button
                className="text-action"
                type="button"
                onClick={() => setShowItemForm(false)}
              >
                Cancel
              </button>
              <button className="secondary-action" type="submit">
                Add item
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="panel">
        <span className="panel-label">Shares</span>
        <h2 className="panel-title">Who pays what</h2>
        {preview ? (
          <div className="share-preview">
            {displayShares.map((share) => (
              <div className="share-row" key={share.adultId}>
                <span>{adultName(share.adultId)}</span>
                <span className="amount">{formatPeso(share.totalCentavos)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="panel-copy">Add items and mark who was present to see the split.</p>
        )}
        <p className="panel-copy">
          {isEditable
            ? "Item sum is authoritative. Shared items split across present adults and students."
            : "Finalized shares are fixed. Reopen to edit."}
        </p>
        {isEditable && isOwner && (presentAdultIds.length < 2 || !payerAdultId) ? (
          <p className="panel-copy">
            {presentAdultIds.length < 2 ? "Mark at least two adults present." : "Choose who paid."}
          </p>
        ) : null}
        {!isOwner ? (
          <p className="panel-copy">
            {data.outing.status === "private_draft"
              ? "Publish this draft when it is ready. The owner finalizes."
              : "Only the owner can finalize."}
          </p>
        ) : null}
        {finalizeMessage ? (
          <p
            className={finalizeMessage.kind === "error" ? "form-error" : "form-notice"}
            role={finalizeMessage.kind === "error" ? "alert" : undefined}
          >
            {finalizeMessage.text}
          </p>
        ) : null}
      </section>

      {data.outing.status === "finalized" && data.shares.length > 0 ? (
        <RecapPanel
          groupName={group?.name ?? "Salo"}
          outing={data.outing}
          shares={recapShares}
          adults={groupAdults}
        />
      ) : null}

      <div className="editor-total">
        <div>
          <div className="total-label">
            {data.outing.status === "reopened" && data.outing.total_mode === "fixed"
              ? "Fixed total"
              : "Total"}
          </div>
          <div className="total-amount">{preview ? formatPeso(preview.totalCentavos) : "—"}</div>
        </div>
        {data.outing.status === "private_draft" ? (
          <button
            className="primary-action"
            type="button"
            onClick={() => void handlePublishDraft()}
            disabled={!canPublishDraft || publishState === "saving"}
          >
            {publishState === "saving" ? "Publishing…" : "Publish draft"}
          </button>
        ) : data.outing.status === "finalized" ? (
          <span className="status-chip status-chip--confirmed">Finalized</span>
        ) : (
          <button
            className="primary-action"
            type="button"
            onClick={() => void handleFinalize()}
            disabled={!canFinalize}
            title={!isOwner ? "Only the owner can finalize" : undefined}
          >
            {finalizeState === "saving" ? "Finalizing…" : "Finalize"}
          </button>
        )}
      </div>
    </div>
  );
}
