import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  invitePendingAdult,
  listOpenInvitations,
  revokePendingInvite
} from "@/features/groups/invitations";
import { PaymentQrImage } from "@/features/payments/PaymentQrImage";
import { clearPaymentQr, uploadPaymentQr, validatePaymentQrFile } from "@/features/payments/qr";
import { listAllStudents, renameStudent, setStudentStatus } from "@/features/students/api";
import { downloadBlob } from "@/lib/download";
import { FileField } from "@/ui/primitives/FileField";
import { Icon } from "@/ui/primitives/Icon";
import { InstallHint } from "@/ui/primitives/InstallHint";
import { useGroup } from "./groupContext";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";
import { usePageTitle } from "@/lib/usePageTitle";
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
  const queryClient = useQueryClient();
  const inviteCardRef = useRef<HTMLElement | null>(null);
  const [inviteBusyId, setInviteBusyId] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteNotice, setInviteNotice] = useState<string | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentEditName, setStudentEditName] = useState("");
  const [rosterBusyId, setRosterBusyId] = useState<string | null>(null);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [rosterNotice, setRosterNotice] = useState<string | null>(null);

  usePageTitle("Settings");

  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");
  const isOwner = group?.owner_id === profile?.id;
  const myAdult = activeAdults.find((adult) => adult.profile_id === profile?.id) ?? null;
  const activeAndPending = adults.filter((adult) => adult.status !== "removed");
  const removedAdults = adults.filter((adult) => adult.status === "removed");
  const eligibleOwners = activeAdults.filter(
    (adult) => adult.profile_id && adult.profile_id !== profile?.id
  );

  const { data: openInvitations } = useQuery({
    queryKey: ["open-invitations", group?.id],
    queryFn: () => listOpenInvitations(group?.id as string),
    enabled: isOwner && Boolean(group?.id)
  });

  const openInviteIds = new Set((openInvitations ?? []).map((invite) => invite.adult_id));

  const { data: roster } = useQuery({
    queryKey: ["students", group?.id],
    queryFn: () => listAllStudents(group?.id as string),
    enabled: Boolean(group?.id)
  });

  useEffect(() => {
    if (invitation) {
      inviteCardRef.current?.scrollIntoView({ block: "center" });
    }
  }, [invitation]);

  useEffect(() => {
    if (!invitation) return;
    const invitedAdult = adults.find((adult) => adult.id === invitation.adult_id);
    if (invitedAdult?.status === "active") {
      setInvitation(null);
      setInviteNotice(null);
    }
  }, [adults, invitation]);

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
      if (group) {
        await queryClient.invalidateQueries({ queryKey: ["open-invitations", group.id] });
      }
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
      if (group) {
        await queryClient.invalidateQueries({ queryKey: ["students", group.id] });
      }
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

  async function handleInvitePending(adultId: string) {
    if (!group) return;
    setInviteBusyId(adultId);
    setInviteError(null);
    setInviteNotice(null);
    try {
      const next = await invitePendingAdult(adultId);
      setInvitation(next);
      setCopied(false);
      setInviteNotice("Invite ready. Share the code with the adult.");
      await queryClient.invalidateQueries({ queryKey: ["open-invitations", group.id] });
    } catch (caught) {
      setInviteError(getErrorMessage(caught, "Could not invite the adult"));
    } finally {
      setInviteBusyId(null);
    }
  }

  async function handleRevokeInvite(adultId: string) {
    if (!group) return;
    setInviteBusyId(adultId);
    setInviteError(null);
    setInviteNotice(null);
    try {
      await revokePendingInvite(adultId);
      if (invitation?.adult_id === adultId) setInvitation(null);
      await queryClient.invalidateQueries({ queryKey: ["open-invitations", group.id] });
      setInviteNotice("Invitation revoked.");
    } catch (caught) {
      setInviteError(getErrorMessage(caught, "Could not revoke the invitation"));
    } finally {
      setInviteBusyId(null);
    }
  }

  async function handleRenameStudent(studentId: string) {
    if (!group) return;
    const nextName = studentEditName.trim();
    if (!nextName) return;

    setRosterBusyId(studentId);
    setRosterError(null);
    setRosterNotice(null);
    try {
      await renameStudent(studentId, nextName);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["students", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["activity", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["history", group.id] });
      setEditingStudentId(null);
      setRosterNotice("Student renamed.");
    } catch (caught) {
      setRosterError(getErrorMessage(caught, "Could not rename the student"));
    } finally {
      setRosterBusyId(null);
    }
  }

  async function handleStudentStatus(studentId: string, status: "active" | "archived") {
    if (!group) return;
    setRosterBusyId(studentId);
    setRosterError(null);
    setRosterNotice(null);
    try {
      await setStudentStatus(studentId, status);
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["students", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["activity", group.id] });
      await queryClient.invalidateQueries({ queryKey: ["history", group.id] });
      setRosterNotice(status === "active" ? "Student reactivated." : "Student archived.");
    } catch (caught) {
      setRosterError(getErrorMessage(caught, "Could not update the student"));
    } finally {
      setRosterBusyId(null);
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
    <div className="page page--settings">
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Members, students, and account.</p>
      </header>

      <section className="panel">
        <h2 className="panel-title">{group?.name}</h2>
        <p className="panel-copy">
          {activeAdults.length} active {activeAdults.length === 1 ? "adult" : "adults"}
          {pendingAdults.length > 0
            ? ` · ${pendingAdults.length} pending ${pendingAdults.length === 1 ? "adult" : "adults"}`
            : ""}
        </p>
      </section>

      {isOwner ? (
        <section className="panel">
          <h2 className="panel-title">Members</h2>
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
          {inviteError ? (
            <p className="form-error" role="alert">
              {inviteError}
            </p>
          ) : null}
          {inviteNotice ? (
            <p className="form-notice" role="status">
              {inviteNotice}
            </p>
          ) : null}

          <ul className="ledger-rows" role="list">
            {activeAndPending.map((adult) => {
              const isGroupOwner = adult.profile_id === group?.owner_id;
              return (
                <li className="ledger-row" key={adult.id}>
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
                    <div className="member-actions">
                      {adult.status === "pending" ? (
                        openInviteIds.has(adult.id) ? (
                          <button
                            className="text-action"
                            type="button"
                            onClick={() => void handleRevokeInvite(adult.id)}
                            disabled={inviteBusyId === adult.id}
                          >
                            <Icon name="x" />
                            {inviteBusyId === adult.id ? "Revoking…" : "Revoke"}
                          </button>
                        ) : (
                          <button
                            className="text-action"
                            type="button"
                            onClick={() => void handleInvitePending(adult.id)}
                            disabled={inviteBusyId === adult.id}
                          >
                            <Icon name="user-plus" />
                            {inviteBusyId === adult.id ? "Inviting…" : "Invite"}
                          </button>
                        )
                      ) : null}
                      {confirmRemoveId === adult.id ? (
                        <>
                          <button
                            className="secondary-action"
                            type="button"
                            onClick={() => void handleRemoveAdult(adult.id)}
                            disabled={memberBusyId === adult.id}
                          >
                            <Icon name="trash" />
                            {memberBusyId === adult.id ? "Removing…" : "Remove"}
                          </button>
                          <button
                            className="text-action"
                            type="button"
                            onClick={() => setConfirmRemoveId(null)}
                          >
                            <Icon name="x" />
                            Keep
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-action is-danger"
                          type="button"
                          onClick={() => setConfirmRemoveId(adult.id)}
                        >
                          <Icon name="trash" />
                          Remove
                        </button>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}

            {removedAdults.map((adult) => (
              <li className="ledger-row" key={adult.id}>
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
                  <Icon name="restore" />
                  {memberBusyId === adult.id ? "Restoring…" : "Restore"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {invitation ? (
        <section className="panel" ref={inviteCardRef}>
          <h2 className="panel-title">
            Invite for{" "}
            {adults.find((adult) => adult.id === invitation.adult_id)?.display_name ?? "new adult"}
          </h2>
          <div className="invite-result">
            <p className="invite-code">{invitation.code}</p>
            <p className="panel-copy">
              Expires{" "}
              {new Date(invitation.expires_at).toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric"
              })}
              . Share it with the adult.
            </p>
            <button className="secondary-action" type="button" onClick={() => void copyCode()}>
              <Icon name="copy" />
              {copied ? "Copied" : "Copy code"}
            </button>
          </div>
          <button className="text-action" type="button" onClick={() => setInvitation(null)}>
            <Icon name="check" />
            Done
          </button>
        </section>
      ) : null}

      {isOwner ? (
        <section className="panel">
          <h2 className="panel-title">Invite an adult</h2>
          <p className="panel-copy">
            Create a pending adult identity, then share the six-character code.
          </p>
          {error ? (
            <p className="form-error" role="alert" id="invite-error">
              {error}
            </p>
          ) : null}
          <form className="auth-form" onSubmit={handleInvite}>
            <label className="field" htmlFor="invite-adult-name">
              <span>Adult name</span>
              <input
                id="invite-adult-name"
                name="adultName"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="Mai"
                autoComplete="off"
                enterKeyHint="done"
                maxLength={50}
                required
              />
            </label>
            <button className="secondary-action" type="submit" disabled={busy}>
              <Icon name="user-plus" />
              {busy ? "Creating…" : "Create invite"}
            </button>
          </form>
        </section>
      ) : null}

      {isOwner ? (
        <section className="panel">
          <h2 className="panel-title">Students</h2>
          <p className="panel-copy">Students never sign in. An adult covers their share.</p>
          {rosterError ? (
            <p className="form-error" role="alert">
              {rosterError}
            </p>
          ) : null}
          {rosterNotice ? (
            <p className="form-notice" role="status">
              {rosterNotice}
            </p>
          ) : null}
          {(roster ?? students).length > 0 ? (
            <ul className="item-list" role="list">
              {(roster ?? students).map((student) => (
                <li className="item-row" key={student.id}>
                  {editingStudentId === student.id ? (
                    <form
                      className="student-edit"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRenameStudent(student.id);
                      }}
                    >
                      <label className="field" htmlFor={`student-rename-${student.id}`}>
                        <span>Student name</span>
                        <input
                          id={`student-rename-${student.id}`}
                          name="studentEditName"
                          type="text"
                          value={studentEditName}
                          onChange={(event) => setStudentEditName(event.target.value)}
                          maxLength={50}
                          required
                        />
                      </label>
                      <div className="form-actions">
                        <button
                          className="secondary-action"
                          type="button"
                          onClick={() => setEditingStudentId(null)}
                        >
                          <Icon name="x" />
                          Cancel
                        </button>
                        <button
                          className="primary-action"
                          type="submit"
                          disabled={rosterBusyId === student.id}
                        >
                          <Icon name="check" />
                          {rosterBusyId === student.id ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <span className="row-main">
                        <span className="row-title">{student.name}</span>
                        <span className="row-sub">
                          {student.status === "active" ? "Active" : "Archived"}
                        </span>
                      </span>
                      <div className="student-actions">
                        <button
                          className="text-action"
                          type="button"
                          onClick={() => {
                            setEditingStudentId(student.id);
                            setStudentEditName(student.name);
                            setRosterNotice(null);
                          }}
                        >
                          <Icon name="pencil" />
                          Rename
                        </button>
                        <button
                          className="text-action"
                          type="button"
                          disabled={rosterBusyId === student.id}
                          onClick={() =>
                            void handleStudentStatus(
                              student.id,
                              student.status === "active" ? "archived" : "active"
                            )
                          }
                        >
                          <Icon name={student.status === "active" ? "archive" : "restore"} />
                          {rosterBusyId === student.id
                            ? "Saving…"
                            : student.status === "active"
                              ? "Archive"
                              : "Reactivate"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="panel-copy">No students yet.</p>
          )}
          {studentError ? (
            <p className="form-error" role="alert" id="student-error">
              {studentError}
            </p>
          ) : null}
          <form className="auth-form" onSubmit={handleAddStudent}>
            <label className="field" htmlFor="student-name">
              <span>Student name</span>
              <input
                id="student-name"
                name="studentName"
                type="text"
                value={studentName}
                onChange={(event) => {
                  setStudentName(event.target.value);
                  if (studentError) setStudentError(null);
                }}
                placeholder="Ana"
                autoComplete="off"
                enterKeyHint="done"
                maxLength={50}
                required
              />
            </label>
            <button className="secondary-action" type="submit" disabled={studentBusy}>
              <Icon name="plus" />
              {studentBusy ? "Adding…" : "Add student"}
            </button>
          </form>
        </section>
      ) : null}

      {isOwner ? (
        <section className="panel">
          <h2 className="panel-title">Transfer ownership</h2>
          <p className="panel-copy">
            The new owner finalizes, reopens, invites, and manages members. You stay a member.
          </p>
          {transferError ? (
            <p className="form-error" role="alert" id="transfer-error">
              {transferError}
            </p>
          ) : null}
          {eligibleOwners.length === 0 ? (
            <p className="panel-copy">
              Invite another adult first. Pending adults cannot own the group.
            </p>
          ) : (
            <>
              <form
                className="auth-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  setTransferConfirm(true);
                }}
              >
                <label className="field" htmlFor="transfer-owner">
                  <span>New owner</span>
                  <select
                    id="transfer-owner"
                    name="newOwner"
                    value={transferTo}
                    onChange={(event) => {
                      setTransferTo(event.target.value);
                      setTransferConfirm(false);
                    }}
                    aria-describedby={transferError ? "transfer-error" : undefined}
                    required
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
                      <Icon name="x" />
                      Keep ownership
                    </button>
                    <button
                      className="primary-action"
                      type="button"
                      onClick={() => void handleTransferOwnership()}
                      disabled={transferBusy}
                    >
                      <Icon name="users" />
                      {transferBusy ? "Transferring…" : "Transfer ownership"}
                    </button>
                  </div>
                ) : (
                  <div className="export-actions">
                    <button className="secondary-action" type="submit" disabled={transferBusy}>
                      <Icon name="users" />
                      Transfer ownership
                    </button>
                  </div>
                )}
              </form>
            </>
          )}
        </section>
      ) : null}

      {myAdult ? (
        <section className="panel">
          <h2 className="panel-title">Payment QR</h2>
          <p className="panel-copy">
            Private to this group. Members scan it with their banking app. It never appears in
            recaps or exports.
          </p>

          {myAdult.payment_qr_path ? (
            <div className="qr-preview">
              <PaymentQrImage path={myAdult.payment_qr_path} name={myAdult.display_name} />
            </div>
          ) : (
            <div className="qr-placeholder qr-placeholder--empty">
              No QR yet. Upload a PNG or JPEG under 2 MB.
            </div>
          )}

          {myAdult.payment_qr_label ? (
            <p className="form-notice">Label: {myAdult.payment_qr_label}</p>
          ) : null}
          {qrError ? (
            <p className="form-error" role="alert" id="qr-error">
              {qrError}
            </p>
          ) : null}
          {qrNotice ? (
            <p className="form-notice" role="status">
              {qrNotice}
            </p>
          ) : null}

          <div className="auth-form">
            <label className="field" htmlFor="payment-qr-label">
              <span>Label</span>
              <input
                id="payment-qr-label"
                name="paymentQrLabel"
                type="text"
                value={qrLabel}
                onChange={(event) => setQrLabel(event.target.value)}
                placeholder="GCash"
                autoComplete="off"
                maxLength={40}
                aria-describedby={qrError ? "qr-error" : undefined}
              />
            </label>
            <FileField
              label="Image"
              name="paymentQr"
              accept="image/png,image/jpeg"
              file={qrFile}
              onSelect={handleQrFile}
              hint="PNG or JPEG, up to 2 MB."
              inputRef={fileInputRef}
            />
          </div>

          <div className="export-actions">
            <button
              className="secondary-action"
              type="button"
              onClick={() => void handleQrUpload()}
              disabled={!qrFile || qrBusy}
            >
              <Icon name="upload" />
              {qrBusy ? "Saving…" : myAdult.payment_qr_path ? "Replace QR" : "Upload QR"}
            </button>
            {myAdult.payment_qr_path ? (
              qrConfirmRemove ? (
                <div className="form-actions">
                  <button
                    className="secondary-action"
                    type="button"
                    onClick={() => setQrConfirmRemove(false)}
                  >
                    <Icon name="x" />
                    Keep
                  </button>
                  <button
                    className="primary-action"
                    type="button"
                    onClick={() => void handleQrRemove()}
                    disabled={qrBusy}
                  >
                    <Icon name="trash" />
                    Remove QR
                  </button>
                </div>
              ) : (
                <button
                  className="text-action is-danger"
                  type="button"
                  onClick={() => setQrConfirmRemove(true)}
                >
                  <Icon name="trash" />
                  Remove QR
                </button>
              )
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel">
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
            <Icon name="download" />
            {exporting === "json" ? "Preparing…" : "Download JSON"}
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void handleExport("csv")}
            disabled={exporting !== null}
          >
            <Icon name="download" />
            {exporting === "csv" ? "Preparing…" : "Download CSV (ZIP)"}
          </button>
        </div>
      </section>

      {isOwner ? (
        <section className="panel">
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
                  <Icon name="x" />
                  Keep active
                </button>
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => void handleArchiveGroup()}
                  disabled={lifecycleBusy !== null}
                >
                  <Icon name="archive" />
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
                  <Icon name="x" />
                  Keep group
                </button>
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => void handleDeleteGroup()}
                  disabled={lifecycleBusy !== null}
                >
                  <Icon name="trash" />
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
                <Icon name="archive" />
                Archive group
              </button>
              <button
                className="text-action is-danger"
                type="button"
                onClick={() => setLifecycleConfirm("delete")}
              >
                <Icon name="trash" />
                Delete group
              </button>
            </div>
          )}
        </section>
      ) : null}

      <InstallHint />

      <section className="panel panel--account">
        <h2 className="panel-title">{profile?.display_name}</h2>
        <p className="panel-copy">{profile?.email}</p>
        <button className="text-action" type="button" onClick={() => void signOut()}>
          <Icon name="log-out" />
          Sign out
        </button>
      </section>
    </div>
  );
}
