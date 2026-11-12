import { Fragment, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { computeShares } from "@/domain/money/computeShares";
import { formatPeso, parsePesoToCentavos } from "@/domain/money/format";
import { deleteLocalDraft, getLocalDraft, saveLocalDraft } from "@/features/drafts/api";
import { publishLocalDraft } from "@/features/drafts/publish";
import type { LocalDraft, LocalDraftItem } from "@/features/drafts/types";
import { useGroup } from "@/features/groups/groupContext";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";
import { Icon } from "@/ui/primitives/Icon";
import { ShareBand } from "@/ui/primitives/ShareBand";

type Assignment = LocalDraftItem["assignmentType"];

export function LocalDraftPage() {
  const { draftId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const online = useOnlineStatus();
  const { profile, adults, students } = useGroup();
  const myAdultId = adults.find((adult) => adult.profile_id === profile?.id)?.id;

  const { data, isLoading } = useQuery({
    queryKey: ["local-draft", profile?.id, draftId],
    queryFn: () => getLocalDraft(draftId as string, profile?.id as string),
    enabled: Boolean(draftId && profile?.id),
    networkMode: "always"
  });

  const [draft, setDraft] = useState<LocalDraft | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [publishBusy, setPublishBusy] = useState<"draft" | "private_draft" | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("1");
  const [itemPrice, setItemPrice] = useState("");
  const [assignment, setAssignment] = useState<Assignment>("shared");
  const [assignedAdultId, setAssignedAdultId] = useState("");
  const [assignedStudentId, setAssignedStudentId] = useState("");

  useEffect(() => {
    if (data) setDraft(data);
  }, [data]);

  useEffect(() => {
    if (!draft) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      void saveLocalDraft(draft).then(() => setSaveState("saved"));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [draft]);

  const activeAdults = adults.filter((adult) => adult.status === "active");
  const activeStudents = students.filter((student) => student.status === "active");
  const preview = useMemo(() => {
    if (!draft) return null;
    try {
      return computeShares({
        presentAdults: draft.presentAdultIds,
        presentStudents: draft.presentStudents.map((student) => ({
          id: student.studentId,
          coveredByAdultId: student.coveringAdultId
        })),
        items: draft.items.map((item) => ({
          amountCentavos: item.quantity * item.unitAmountCentavos,
          assignmentType: item.assignmentType,
          assignedAdultId: item.assignedAdultId,
          assignedStudentId: item.assignedStudentId
        })),
        totalMode: "auto",
        manualTotalCentavos: null,
        fixedTotalCentavos: null
      });
    } catch {
      return null;
    }
  }, [draft]);

  function update(patch: Partial<LocalDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  const splitSlices = useMemo(() => {
    if (!preview) return [];
    const byId = new Map(adults.map((adult) => [adult.id, adult.display_name]));
    const order = new Map(adults.map((adult, index) => [adult.id, index]));
    return [...preview.shares]
      .filter((share) => share.totalCentavos > 0)
      .sort(
        (a, b) =>
          (order.get(a.adultId) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.adultId) ?? Number.MAX_SAFE_INTEGER)
      )
      .map((share) => ({
        id: share.adultId,
        name: byId.get(share.adultId) ?? "Adult",
        amountCentavos: share.totalCentavos
      }));
  }, [preview, adults]);

  function toggleAdult(adultId: string, present: boolean) {
    setDraft((current) => {
      if (!current) return current;
      const presentAdultIds = present
        ? [...new Set([...current.presentAdultIds, adultId])]
        : current.presentAdultIds.filter((id) => id !== adultId);

      const presentStudents = current.presentStudents.filter((student) =>
        presentAdultIds.includes(student.coveringAdultId)
      );
      const removedStudentIds = new Set(
        current.presentStudents
          .filter((student) => !presentAdultIds.includes(student.coveringAdultId))
          .map((student) => student.studentId)
      );

      const items = current.items.filter(
        (item) =>
          item.assignedAdultId !== adultId &&
          (!item.assignedStudentId || !removedStudentIds.has(item.assignedStudentId))
      );

      return {
        ...current,
        presentAdultIds,
        presentStudents,
        items,
        payerAdultId: presentAdultIds.includes(current.payerAdultId) ? current.payerAdultId : ""
      };
    });
  }

  function toggleStudent(studentId: string, present: boolean) {
    setDraft((current) => {
      if (!current) return current;
      if (!present) {
        return {
          ...current,
          presentStudents: current.presentStudents.filter(
            (student) => student.studentId !== studentId
          ),
          items: current.items.filter((item) => item.assignedStudentId !== studentId)
        };
      }

      if (current.presentStudents.some((student) => student.studentId === studentId)) {
        return current;
      }

      const cover = current.presentAdultIds[0];
      if (!cover) return current;

      return {
        ...current,
        presentStudents: [...current.presentStudents, { studentId, coveringAdultId: cover }]
      };
    });
  }

  function changeCover(studentId: string, coveringAdultId: string) {
    setDraft((current) =>
      current
        ? {
            ...current,
            presentStudents: current.presentStudents.map((student) =>
              student.studentId === studentId ? { ...student, coveringAdultId } : student
            )
          }
        : current
    );
  }

  function addItem() {
    if (!draft) return;
    const amount = parsePesoToCentavos(itemPrice);
    if (!itemName.trim() || amount <= 0) {
      setPublishError("Add an item name and a price greater than zero.");
      return;
    }
    if (assignment === "adult" && !draft.presentAdultIds.includes(assignedAdultId)) {
      setPublishError("Choose a present adult for this item.");
      return;
    }
    if (
      assignment === "student" &&
      !draft.presentStudents.some((student) => student.studentId === assignedStudentId)
    ) {
      setPublishError("Choose a present student for this item.");
      return;
    }

    const item: LocalDraftItem = {
      id: crypto.randomUUID(),
      name: itemName.trim(),
      quantity: Math.max(1, Number.parseInt(itemQty, 10) || 1),
      unitAmountCentavos: amount,
      assignmentType: assignment,
      assignedAdultId: assignment === "adult" ? assignedAdultId : null,
      assignedStudentId: assignment === "student" ? assignedStudentId : null
    };

    setDraft({ ...draft, items: [...draft.items, item] });
    setItemName("");
    setItemQty("1");
    setItemPrice("");
    setAssignedAdultId("");
    setAssignedStudentId("");
    setPublishError(null);
  }

  function removeItem(itemId: string) {
    setDraft((current) =>
      current ? { ...current, items: current.items.filter((item) => item.id !== itemId) } : current
    );
  }

  async function handlePublish(status: "draft" | "private_draft") {
    if (!draft || !online) return;
    setPublishBusy(status);
    setPublishError(null);
    try {
      const outingId = await publishLocalDraft(draft, status);
      await queryClient.invalidateQueries({ queryKey: ["outings", draft.groupId] });
      await queryClient.invalidateQueries({ queryKey: ["local-drafts", draft.groupId] });
      navigate(`/outings/${outingId}`);
    } catch (caught) {
      setPublishError(getErrorMessage(caught, "Could not publish the draft"));
    } finally {
      setPublishBusy(null);
    }
  }

  async function handleDelete() {
    if (!draft) return;
    await deleteLocalDraft(draft.id);
    await queryClient.invalidateQueries({ queryKey: ["local-drafts", draft.groupId] });
    navigate("/");
  }

  if (isLoading) {
    return (
      <div className="page">
        <p className="panel-copy">Loading draft…</p>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="page">
        <header className="page-head">
          <h1 className="page-title">Draft not found</h1>
          <p className="page-sub">This private draft is no longer on this device.</p>
        </header>
        <Link className="text-link" to="/">
          <Icon name="chevron-left" />
          Back to Home
        </Link>
      </div>
    );
  }

  const canPublish =
    online &&
    Boolean(preview) &&
    draft.presentAdultIds.length >= 2 &&
    Boolean(draft.date) &&
    publishBusy === null;

  return (
    <div className="page page--editor">
      <div className="editor-head">
        <button className="text-link" type="button" onClick={() => navigate("/")}>
          <Icon name="chevron-left" />
          Back
        </button>
        <header className="page-head">
          <h1 className="page-title">{draft.place || "Private draft"}</h1>
          <p className="page-sub">
            {formatDate(draft.date)} · saved on this device ·{" "}
            {saveState === "saving" ? "Saving…" : "Saved"}
          </p>
        </header>
      </div>

      {publishError ? (
        <p className="form-error" role="alert">
          {publishError}
        </p>
      ) : null}
      {!online ? (
        <p className="form-notice" role="status">
          Offline. This draft stays on this device until you reconnect.
        </p>
      ) : null}

      <form className="panel auth-form" onSubmit={(event) => event.preventDefault()}>
        <h2 className="panel-title">The table</h2>
        <div className="field-pair">
          <label className="field">
            <span>Date</span>
            <input
              type="date"
              value={draft.date}
              onChange={(event) => update({ date: event.target.value })}
            />
          </label>
          <label className="field">
            <span>Place</span>
            <input
              type="text"
              value={draft.place}
              onChange={(event) => update({ place: event.target.value })}
              placeholder="McDo Il Corso"
              maxLength={120}
            />
          </label>
        </div>
        <label className="field">
          <span>Notes</span>
          <input
            type="text"
            value={draft.notes}
            onChange={(event) => update({ notes: event.target.value })}
            placeholder="Friday dinner"
            maxLength={1000}
          />
        </label>
        <label className="field">
          <span>Paid by</span>
          <select
            value={draft.payerAdultId}
            onChange={(event) => update({ payerAdultId: event.target.value })}
          >
            <option value="">Choose a payer later</option>
            {activeAdults
              .filter((adult) => draft.presentAdultIds.includes(adult.id))
              .map((adult) => (
                <option key={adult.id} value={adult.id}>
                  {adult.display_name}
                </option>
              ))}
          </select>
        </label>
      </form>

      <section className="panel">
        <h2 className="panel-title">At the table</h2>
        <div className="attendance-grid">
          {activeAdults.map((adult) => {
            const present = draft.presentAdultIds.includes(adult.id);
            return (
              <button
                className={`person${present ? " is-on" : ""}`}
                key={adult.id}
                type="button"
                aria-pressed={present}
                onClick={() => toggleAdult(adult.id, !present)}
              >
                <span className="member-initials" style={{ background: adult.color }}>
                  {initials(adult.display_name)}
                </span>
                <span>{adult.display_name}</span>
              </button>
            );
          })}
        </div>

        {activeStudents.length > 0 ? (
          <div className="student-list">
            {activeStudents.map((student) => {
              const present = draft.presentStudents.find((row) => row.studentId === student.id);
              return (
                <div className="student-row" key={student.id}>
                  <label className="student-check">
                    <input
                      type="checkbox"
                      checked={Boolean(present)}
                      onChange={() => toggleStudent(student.id, !present)}
                    />
                    <span>{student.name}</span>
                  </label>
                  {present ? (
                    <select
                      aria-label={`Cover for ${student.name}`}
                      value={present.coveringAdultId}
                      onChange={(event) => changeCover(student.id, event.target.value)}
                    >
                      {activeAdults
                        .filter((adult) => draft.presentAdultIds.includes(adult.id))
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
          <p className="panel-copy">No students yet. Add them in Settings.</p>
        )}
      </section>

      <section className="panel">
        <h2 className="panel-title">The bill</h2>

        <form
          className="auth-form"
          onSubmit={(event) => {
            event.preventDefault();
            addItem();
          }}
        >
          <label className="field">
            <span>Item</span>
            <input
              type="text"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="Shared rice"
              maxLength={120}
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
              />
            </label>
          </div>
          <label className="field">
            <span>Who shares it</span>
            <select
              value={assignment}
              onChange={(event) => {
                setAssignment(event.target.value as Assignment);
                setAssignedAdultId("");
                setAssignedStudentId("");
              }}
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
                {activeAdults
                  .filter((adult) => draft.presentAdultIds.includes(adult.id))
                  .map((adult) => (
                    <option key={adult.id} value={adult.id}>
                      {adult.display_name}
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
                {draft.presentStudents.map((student) => {
                  const name =
                    activeStudents.find((row) => row.id === student.studentId)?.name ?? "Student";
                  return (
                    <option key={student.studentId} value={student.studentId}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </label>
          ) : null}
          <div className="form-actions">
            <button className="text-action" type="submit">
              <Icon name="plus" />
              Add item
            </button>
          </div>
        </form>

        <div className="item-list">
          {draft.items.map((item) => (
            <Fragment key={item.id}>
              <div className="item-row">
                <span className="row-main">
                  <span className="row-title">{item.name}</span>
                  <span className="row-sub">
                    {item.quantity} × {formatPeso(item.unitAmountCentavos)} ·{" "}
                    {item.assignmentType === "shared"
                      ? "Shared"
                      : item.assignmentType === "adult"
                        ? "One adult"
                        : "One student"}
                  </span>
                </span>
                <span className="amount">
                  {formatPeso(item.quantity * item.unitAmountCentavos)}
                </span>
                <button
                  className="icon-action is-danger"
                  type="button"
                  onClick={() => setDeletingItemId(item.id)}
                  aria-label={`Remove ${item.name}`}
                  title="Remove item"
                >
                  <Icon name="trash" />
                </button>
              </div>
              {deletingItemId === item.id ? (
                <div className="item-confirm">
                  <span className="panel-copy" role="status">
                    Remove {item.name}?
                  </span>
                  <div className="item-confirm-actions">
                    <button
                      className="text-action"
                      type="button"
                      onClick={() => setDeletingItemId(null)}
                    >
                      <Icon name="x" />
                      Keep
                    </button>
                    <button
                      className="text-action is-danger"
                      type="button"
                      onClick={() => {
                        setDeletingItemId(null);
                        removeItem(item.id);
                      }}
                    >
                      <Icon name="trash" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : null}
            </Fragment>
          ))}
          {draft.items.length === 0 ? (
            <p className="panel-copy">Add the first item to start the bill.</p>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <h2 className="panel-title">Who pays what</h2>
        {preview ? (
          <ShareBand slices={splitSlices} youId={myAdultId} label="The split" />
        ) : (
          <p className="panel-copy">
            Mark at least two adults present and assign every item to see the split.
          </p>
        )}
        {!online ? <p className="panel-copy">Connect to publish or share this draft.</p> : null}
      </section>

      <section className="panel">
        <h2 className="panel-title">Publish when ready</h2>
        <p className="panel-copy">
          Share with the owner first to keep it private to the two of you, or publish it for the
          whole table.
        </p>
        <div className="export-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handlePublish("private_draft")}
            disabled={!canPublish}
          >
            <Icon name="users" />
            {publishBusy === "private_draft" ? "Sharing…" : "Share with owner"}
          </button>
          {confirmDelete ? (
            <div className="form-actions">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setConfirmDelete(false)}
              >
                <Icon name="x" />
                Keep draft
              </button>
              <button className="primary-action" type="button" onClick={() => void handleDelete()}>
                <Icon name="trash" />
                Delete draft
              </button>
            </div>
          ) : (
            <button
              className="text-action is-danger"
              type="button"
              onClick={() => setConfirmDelete(true)}
            >
              <Icon name="trash" />
              Delete draft
            </button>
          )}
        </div>
      </section>

      <div className="editor-total">
        <div>
          <div className="total-label">Total</div>
          <div className="total-amount">{preview ? formatPeso(preview.totalCentavos) : "—"}</div>
        </div>
        <button
          className="primary-action"
          type="button"
          onClick={() => void handlePublish("draft")}
          disabled={!canPublish}
        >
          <Icon name="upload" />
          {publishBusy === "draft" ? "Publishing…" : "Publish"}
        </button>
      </div>
    </div>
  );
}
