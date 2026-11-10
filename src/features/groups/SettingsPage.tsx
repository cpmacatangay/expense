import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/authContext";
import { useGroup } from "./groupContext";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";
import type { Invitation } from "./types";

export function SettingsPage() {
  const { profile, group, adults, students, inviteAdult, createStudent } = useGroup();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentBusy, setStudentBusy] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);

  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");
  const isOwner = group?.owner_id === profile?.id;

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
