import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { computeShares } from "@/domain/money/computeShares";
import { formatPeso, parsePesoToCentavos } from "@/domain/money/format";
import { useGroup } from "@/features/groups/groupContext";
import {
  addItem,
  deleteItem,
  getOuting,
  setAdultPresent,
  setStudentPresent,
  updateOuting
} from "@/features/outings/api";
import type { AssignmentType } from "@/features/outings/types";
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

  const [date, setDate] = useState("");
  const [place, setPlace] = useState("");
  const [notes, setNotes] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [actionError, setActionError] = useState<string | null>(null);
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
        notes: notes.trim() || null
      });
      await refresh();
      setSaveState("saved");
    } catch (caught) {
      setSaveState("idle");
      setActionError(getErrorMessage(caught, "Could not save the outing"));
    }
  }

  async function toggleAdult(adultId: string, present: boolean) {
    if (!data) return;
    setActionError(null);
    try {
      await setAdultPresent(data.outing.id, adultId, present);
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

  return (
    <div className="page page--editor">
      <div className="editor-head">
        <button className="text-action" type="button" onClick={() => navigate("/")}>
          Back
        </button>
        <header className="page-head">
          <h1 className="page-title">{data.outing.place || "New outing"}</h1>
          <p className="page-sub">
            {formatDate(data.outing.date)} · {data.outing.status}
          </p>
        </header>
      </div>

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
            .filter((adult) => adult.status === "active")
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
                        .filter(
                          (adult) => adult.status === "active" && presentAdultIds.includes(adult.id)
                        )
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
          {data.items.length > 0 && !showItemForm ? (
            <button className="text-action" type="button" onClick={() => setShowItemForm(true)}>
              Add item
            </button>
          ) : null}
        </div>

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
            {preview.shares.map((share) => (
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
          Item sum is authoritative. Shared items split across present adults and students.
        </p>
        <p className="panel-copy">Finalization arrives in the next step.</p>
      </section>

      <div className="editor-total">
        <div>
          <div className="total-label">Total</div>
          <div className="total-amount">{preview ? formatPeso(preview.totalCentavos) : "—"}</div>
        </div>
        <button className="primary-action" type="button" disabled>
          Finalize
        </button>
      </div>
    </div>
  );
}
