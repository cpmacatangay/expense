import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/authContext";
import { buildCsvFiles, exportBaseName, zipCsvFiles } from "@/features/export/csv";
import { loadGroupExport, loadMemberExport } from "@/features/export/load";
import {
  archiveGroup,
  removeAdult,
  restoreAdult,
  softDeleteGroup,
  transferOwnership
} from "@/features/groups/lifecycle";
import { PaymentQrImage } from "@/features/payments/PaymentQrImage";
import { clearPaymentQr, uploadPaymentQr, validatePaymentQrFile } from "@/features/payments/qr";
import { downloadBlob } from "@/lib/download";
import { useGroup } from "./groupContext";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";
import type { Invitation } from "./types";

export function SettingsPage() {
  const { profile, group, adults, students, inviteAdult, createStudent, refresh } = useGroup();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentBusy, setStudentBusy] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [qrLabel, setQrLabel] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrBusy, setQrBusy] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrNotice, setQrNotice] = useState<string | null>(null);
  const [qrConfirmRemove, setQrConfirmRemove] = useState(false);
  const [memberBusyId, setMemberBusyId] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [memberNotice, setMemberNotice] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [transferTo, setTransferTo] = useState("");
  const [transferConfirm, setTransferConfirm] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [lifecycleConfirm, setLifecycleConfirm] = useState<"archive" | "delete" | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState<"archive" | "delete" | null>(null);
  const [lifecycleError, setLifecycleError] = useState<string | null>(null);

  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");
  const isOwner = group?.owner_id === profile?.id;
  const myAdult =
    activeAdults.find((adult) => adult.profile_id === profile?.id) ?? null;
  const activeAndPending = adults.filter((adult) => adult.status !== "removed");
  const removedAdults = adults.filter((adult) => adult.status === "removed");
  const eligibleOwners = activeAdults.filter(
    (adult) => adult.profile_id && adult.profile_id !== profile?.id
  );

  useEffect(() => {
    setQrLabel(myAdult?.payment_qr_label ?? "");
  }, [myAdult?.payment_qr_label]);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInvitation(null);
    setCopied(false);
    try {
      const next = await inviteAdult(name.trim());
      setInvitation(next);
      setName("");
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create the invitation"));
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!invitation) return;
    await navigator.clipboard.writeText(invitation.code);
    setCopied(true);
  }

  async function handleAddStudent(event: FormEvent) {
    event.preventDefault();
    setStudentBusy(true);
    setStudentError(null);
    try {
      await createStudent(studentName.trim());
      setStudentName("");
    } catch (caught) {
      setStudentError(getErrorMessage(caught, "Could not add the student"));
    } finally {
      setStudentBusy(false);
    }
  }

  async function handleExport(format: "json" | "csv") {
    if (!group || !profile) return;
    setExporting(format);
    setExportError(null);
    setExportNotice(null);
    try {
      const data = isOwner
        ? await loadGroupExport(group.id)
        : await loadMemberExport(group.id, profile.id);
      const base = exportBaseName(data);

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json"
        });
        downloadBlob(blob, `${base}.json`);
      } else {
        downloadBlob(zipCsvFiles(buildCsvFiles(data)), `${base}.zip`);
      }

      setExportNotice(isOwner ? "Group export downloaded." : "Your export downloaded.");
    } catch (caught) {
      setExportError(getErrorMessage(caught, "Could not prepare the export"));
    } finally {
      setExporting(null);
    }
  }

  function handleQrFile(file: File | null) {
    setQrError(null);
    setQrNotice(null);
    setQrFile(null);

    if (!file) return;

    try {
      validatePaymentQrFile(file);
      setQrFile(file);
    } catch (caught) {
      setQrError(getErrorMessage(caught, "Choose a PNG or JPEG under 2 MB."));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleQrUpload() {
    if (!group || !myAdult || !qrFile) return;
    setQrBusy(true);
    setQrError(null);
    setQrNotice(null);
    try {
      await uploadPaymentQr({
        groupId: group.id,
        adultId: myAdult.id,
        file: qrFile,
        label: qrLabel,
        previousPath: myAdult.payment_qr_path
      });
      await refresh();
      setQrFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setQrNotice("Payment QR saved.");
    } catch (caught) {
      setQrError(getErrorMessage(caught, "Could not save the payment QR"));
    } finally {
      setQrBusy(false);
    }
  }

  async function handleQrRemove() {
    if (!myAdult) return;
    setQrBusy(true);
    setQrError(null);
    setQrNotice(null);
    try {
      await clearPaymentQr(myAdult.id, myAdult.payment_qr_path);
      await refresh();
      setQrConfirmRemove(false);
      setQrLabel("");
      setQrFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setQrNotice("Payment QR removed.");
    } catch (caught) {
      setQrError(getErrorMessage(caught, "Could not remove the payment QR"));
    } finally {
      setQrBusy(false);
    }
  }

  async function handleRemoveAdult(adultId: string) {
    setMemberBusyId(adultId);
    setMemberError(null);
    setMemberNotice(null);
    try {
      await removeAdult(adultId);
      await refresh();
      setConfirmRemoveId(null);
      setMemberNotice("Adult removed. Their shares, settlements, and activity stay.");
    } catch (caught) {
      setMemberError(getErrorMessage(caught, "Could not remove the adult"));
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleRestoreAdult(adultId: string) {
    setMemberBusyId(adultId);
    setMemberError(null);
    setMemberNotice(null);
    try {
      await restoreAdult(adultId);
      await refresh();
      setMemberNotice("Adult restored.");
    } catch (caught) {
      setMemberError(getErrorMessage(caught, "Could not restore the adult"));
    } finally {
      setMemberBusyId(null);
    }
  }

  async function handleTransferOwnership() {
    if (!group || !transferTo) return;
    setTransferBusy(true);
    setTransferError(null);
    try {
      await transferOwnership(group.id, transferTo);
      await refresh();
      setTransferConfirm(false);
      setTransferTo("");
    } catch (caught) {
      setTransferError(getErrorMessage(caught, "Could not transfer ownership"));
    } finally {
      setTransferBusy(false);
    }
  }

  async function handleArchiveGroup() {
    if (!group) return;
    setLifecycleBusy("archive");
    setLifecycleError(null);
    try {
      await archiveGroup(group.id);
      await refresh();
    } catch (caught) {
      setLifecycleError(getErrorMessage(caught, "Could not archive the group"));
    } finally {
      setLifecycleBusy(null);
    }
  }

  async function handleDeleteGroup() {
    if (!group) return;
    setLifecycleBusy("delete");
    setLifecycleError(null);
    try {
      await softDeleteGroup(group.id);
      await refresh();
    } catch (caught) {
      setLifecycleError(getErrorMessage(caught, "Could not delete the group"));
    } finally {
      setLifecycleBusy(null);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Members, students, and account.</p>
      </header>

      <section className="panel">
        <span className="panel-label">Group</span>
        <h2 className="panel-title">{group?.name}</h2>
        <p className="panel-copy">
          {activeAdults.length} active {activeAdults.length === 1 ? "adult" : "adults"}
          {pendingAdults.length > 0
            ? ` · ${pendingAdults.length} pending ${pendingAdults.length === 1 ? "adult" : "adults"}`
            : ""}
        </p>
        <div className="member-strip" aria-label="Group adults">
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
      </section>

      {isOwner ? (
        <section className="panel">
          <span className="panel-label">Members</span>
          <h2 className="panel-title">Remove or restore adults</h2>
          <p className="panel-copy">
            Removed adults lose access. Their shares, settlements, and activity stay.
          </p>
          {memberError ? (
            <p className="form-error" role="alert">
              {memberError}
            </p>
          ) : null}
          {memberNotice ? (
            <p className="form-notice" role="status">
              {memberNotice}
            </p>
          ) : null}

          <div className="ledger-rows">
            {activeAndPending.map((adult) => {
              const isGroupOwner = adult.profile_id === group?.owner_id;
              return (
                <div className="ledger-row" key={adult.id}>
                  <span className="member-initials" style={{ background: adult.color }}>
                    {initials(adult.display_name)}
                  </span>
                  <span className="ledger-name">
                    {adult.display_name}
                    {isGroupOwner ? <span className="ledger-you">Owner</span> : null}
                    {adult.status === "pending" ? (
                      <span className="member-status">Pending</span>
                    ) : null}
                  </span>
                  {!isGroupOwner ? (
                    confirmRemoveId === adult.id ? (
                      <div className="ledger-actions">
                        <button
                          className="secondary-action"
                          type="button"
                          onClick={() => void handleRemoveAdult(adult.id)}
                          disabled={memberBusyId === adult.id}
                        >
                          {memberBusyId === adult.id ? "Removing…" : "Remove"}
                        </button>
                        <button
                          className="text-action"
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                        >
                          Keep
                        </button>
                      </div>
                    ) : (
                      <button
                        className="text-action is-danger"
                        type="button"
                        onClick={() => setConfirmRemoveId(adult.id)}
                      >
                        Remove
                      </button>
                    )
                  ) : null}
                </div>
              );
            })}

            {removedAdults.map((adult) => (
              <div className="ledger-row" key={adult.id}>
                <span className="member-initials" style={{ background: adult.color }}>
                  {initials(adult.display_name)}
                </span>
                <span className="ledger-name">
                  {adult.display_name}
                  <span className="member-status">Removed</span>
                </span>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => void handleRestoreAdult(adult.id)}
                  disabled={memberBusyId === adult.id}
                >
                  {memberBusyId === adult.id ? "Restoring…" : "Restore"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {isOwner ? (
        <section className="panel">
          <span className="panel-label">Invite</span>
          <h2 className="panel-title">Invite an adult</h2>
          <p className="panel-copy">Create a pending adult identity, then share the six-character code.</p>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          {invitation ? (
            <div className="invite-result">
              <p className="invite-code">{invitation.code}</p>
              <p className="panel-copy">
                Expires {new Date(invitation.expires_at).toLocaleDateString("en-PH", {
                  month: "short",
                  day: "numeric"
                })}
                . Share it with the adult.
              </p>
              <button className="secondary-action" type="button" onClick={() => void copyCode()}>
                {copied ? "Copied" : "Copy code"}
              </button>
            </div>
          ) : null}
          <form className="auth-form" onSubmit={handleInvite}>
            <label className="field">
              <span>Adult name</span>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Mai"
                maxLength={50}
                required
              />
            </label>
            <button className="secondary-action" type="submit" disabled={busy || name.trim().length < 1}>
              {busy ? "Creating…" : "Create invite"}
            </button>
          </form>
        </section>
      ) : null}

      {isOwner ? (
        <section className="panel">
          <span className="panel-label">Students</span>
          <h2 className="panel-title">Students</h2>
          <p className="panel-copy">Students never sign in. An adult covers their share.</p>
          {students.length > 0 ? (
            <div className="item-list">
              {students.map((student) => (
                <div className="item-row" key={student.id}>
                  <span className="row-main">
                    <span className="row-title">{student.name}</span>
                    <span className="row-sub">Active</span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-copy">No students yet.</p>
          )}
          {studentError ? (
            <p className="form-error" role="alert">
              {studentError}
            </p>
          ) : null}
          <form className="auth-form" onSubmit={handleAddStudent}>
            <label className="field">
              <span>Student name</span>
              <input
                type="text"
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                placeholder="Ana"
                maxLength={50}
                required
              />
            </label>
            <button
              className="secondary-action"
              type="submit"
              disabled={studentBusy || studentName.trim().length < 1}
            >
              {studentBusy ? "Adding…" : "Add student"}
            </button>
          </form>
        </section>
      ) : null}

      {isOwner ? (
        <section className="panel">
          <span className="panel-label">Ownership</span>
          <h2 className="panel-title">Transfer ownership</h2>
          <p className="panel-copy">
            The new owner finalizes, reopens, invites, and manages members. You stay a member.
          </p>
          {transferError ? (
            <p className="form-error" role="alert">
              {transferError}
            </p>
          ) : null}
          {eligibleOwners.length === 0 ? (
            <p className="panel-copy">
              Invite another adult first. Pending adults cannot own the group.
            </p>
          ) : (
            <>
              <label className="field">
                <span>New owner</span>
                <select
                  value={transferTo}
                  onChange={(event) => {
                    setTransferTo(event.target.value);
                    setTransferConfirm(false);
                  }}
                >
                  <option value="">Choose an adult</option>
                  {eligibleOwners.map((adult) => (
                    <option key={adult.id} value={adult.id}>
                      {adult.display_name}
                    </option>
                  ))}
                </select>
              </label>
              {transferConfirm ? (
                <div className="export-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => setTransferConfirm(false)}
                  >
                    Keep ownership
                  </button>
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => void handleTransferOwnership()}
                    disabled={transferBusy}
                  >
                    {transferBusy ? "Transferring…" : "Transfer ownership"}
                  </button>
                </div>
              ) : (
                <div className="export-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => setTransferConfirm(true)}
                    disabled={!transferTo}
                  >
                    Transfer ownership
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      ) : null}

      {myAdult ? (
        <section className="panel">
          <span className="panel-label">Payment QR</span>
          <h2 className="panel-title">Your payment QR</h2>
          <p className="panel-copy">
            Private to this group. Members scan it with their banking app. It never appears in
            recaps or exports.
          </p>

          <div className="qr-preview">
            {myAdult.payment_qr_path ? (
              <PaymentQrImage
                path={myAdult.payment_qr_path}
                name={myAdult.display_name}
              />
            ) : (
              <div className="qr-placeholder">
                No QR yet. Upload a PNG or JPEG under 2 MB.
              </div>
            )}
          </div>

          {myAdult.payment_qr_label ? (
            <p className="form-notice">Label: {myAdult.payment_qr_label}</p>
          ) : null}
          {qrError ? (
            <p className="form-error" role="alert">
              {qrError}
            </p>
          ) : null}
          {qrNotice ? (
            <p className="form-notice" role="status">
              {qrNotice}
            </p>
          ) : null}

          <label className="field">
            <span>Label</span>
            <input
              type="text"
              value={qrLabel}
              onChange={(event) => setQrLabel(event.target.value)}
              placeholder="GCash"
              maxLength={40}
            />
          </label>
          <label className="field">
            <span>Image</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              onChange={(event) => void handleQrFile(event.target.files?.[0] ?? null)}
            />
          </label>
          <p className="form-notice">PNG or JPEG, up to 2 MB.</p>

          <div className="export-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => void handleQrUpload()}
              disabled={!qrFile || qrBusy}
            >
              {qrBusy
                ? "Saving…"
                : myAdult.payment_qr_path
                  ? "Replace QR"
                  : "Upload QR"}
            </button>
            {myAdult.payment_qr_path ? (
              qrConfirmRemove ? (
                <div className="form-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => setQrConfirmRemove(false)}
                  >
                    Keep
                  </button>
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => void handleQrRemove()}
                    disabled={qrBusy}
                  >
                    Remove QR
                  </button>
                </div>
              ) : (
                <button
                  className="text-action is-danger"
                  type="button"
                  onClick={() => setQrConfirmRemove(true)}
                >
                  Remove QR
                </button>
              )
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <span className="panel-label">Export</span>
        <h2 className="panel-title">{isOwner ? "Export the group" : "Export your data"}</h2>
        <p className="panel-copy">
          {isOwner
            ? "Every outing, item, share, settlement, and activity event, plus adults and students. Payment QR images are never included."
            : "Only your shares, settlements, and activity, plus the outings they belong to. No one else's data is included."}
        </p>
        {exportError ? (
          <p className="form-error" role="alert">
            {exportError}
          </p>
        ) : null}
        {exportNotice ? (
          <p className="form-notice" role="status">
            {exportNotice}
          </p>
        ) : null}
        <div className="export-actions">
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handleExport("json")}
            disabled={exporting !== null}
          >
            {exporting === "json" ? "Preparing…" : "Download JSON"}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handleExport("csv")}
            disabled={exporting !== null}
          >
            {exporting === "csv" ? "Preparing…" : "Download CSV (ZIP)"}
          </button>
        </div>
      </section>

      {isOwner ? (
        <section className="panel">
          <span className="panel-label">Group lifecycle</span>
          <h2 className="panel-title">Archive or delete</h2>
          <p className="panel-copy">
            Archiving hides the group from every member. Deleting keeps the data restorable for 30
            days.
          </p>
          {lifecycleError ? (
            <p className="form-error" role="alert">
              {lifecycleError}
            </p>
          ) : null}

          {lifecycleConfirm === "archive" ? (
            <>
              <p className="panel-copy">
                Archive {group?.name}? Members lose access until you restore it.
              </p>
              <div className="export-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => setLifecycleConfirm(null)}
                >
                  Keep active
                </button>
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => void handleArchiveGroup()}
                  disabled={lifecycleBusy !== null}
                >
                  {lifecycleBusy === "archive" ? "Archiving…" : "Archive group"}
                </button>
              </div>
            </>
          ) : lifecycleConfirm === "delete" ? (
            <>
              <p className="panel-copy">
                Delete {group?.name}? It hides for everyone and can be restored for 30 days.
              </p>
              <div className="export-actions">
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => setLifecycleConfirm(null)}
                >
                  Keep group
                </button>
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => void handleDeleteGroup()}
                  disabled={lifecycleBusy !== null}
                >
                  {lifecycleBusy === "delete" ? "Deleting…" : "Delete group"}
                </button>
              </div>
            </>
          ) : (
            <div className="export-actions">
              <button
                className="secondary-action"
                type="button"
                onClick={() => setLifecycleConfirm("archive")}
              >
                Archive group
              </button>
              <button
                className="text-action is-danger"
                type="button"
                onClick={() => setLifecycleConfirm("delete")}
              >
                Delete group
              </button>
            </div>
          )}
        </section>
      ) : null}

      <section className="panel panel--account">
        <span className="panel-label">Account</span>
        <h2 className="panel-title">{profile?.display_name}</h2>
        <p className="panel-copy">{profile?.email}</p>
        <button className="text-action" type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </div>
  );
}
