import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/authContext";
import { buildCsvFiles, exportBaseName, zipCsvFiles } from "@/features/export/csv";
import { loadGroupExport, loadMemberExport } from "@/features/export/load";
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

  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");
  const isOwner = group?.owner_id === profile?.id;
  const myAdult =
    activeAdults.find((adult) => adult.profile_id === profile?.id) ?? null;

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
            ? ` · ${pendingAdults.length} pending ${pendingAdults.length === 1 ? "invite" : "invites"}`
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
