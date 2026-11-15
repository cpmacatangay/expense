import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/authContext";
import { listInactiveOwnedGroups, restoreGroup } from "@/features/groups/lifecycle";
import { getErrorMessage } from "@/lib/errors";
import { Icon } from "@/ui/primitives/Icon";
import { useGroup } from "./groupContext";

export function FirstRunPanel() {
  const { profile, createGroup, joinGroup, refresh } = useGroup();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreBusyId, setRestoreBusyId] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const { data: inactiveGroups } = useQuery({
    queryKey: ["inactive-groups", profile?.id],
    queryFn: listInactiveOwnedGroups,
    enabled: Boolean(profile)
  });

  async function handleRestore(groupId: string) {
    setRestoreBusyId(groupId);
    setRestoreError(null);
    try {
      await restoreGroup(groupId);
      await refresh();
    } catch (caught) {
      setRestoreError(getErrorMessage(caught, "Could not restore the table"));
    } finally {
      setRestoreBusyId(null);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy("create");
    setError(null);
    try {
      await createGroup(name.trim());
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create the table"));
      setBusy(null);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setBusy("join");
    setError(null);
    try {
      await joinGroup(code.trim().toUpperCase());
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not join the table"));
      setBusy(null);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Start a table</h1>
        <p className="page-sub">
          Signed in as {profile?.display_name ?? "your account"}. A table keeps one shared ledger
          for 2 to 12 adults.
        </p>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <h2 className="panel-title">New table</h2>
        <form className="auth-form" onSubmit={handleCreate}>
          <label className="field" htmlFor="first-run-name">
            <span>Table name</span>
            <input
              id="first-run-name"
              name="groupName"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              placeholder="Salo Crew"
              minLength={2}
              maxLength={60}
              autoComplete="organization"
              enterKeyHint="done"
              required
            />
          </label>
          <button className="primary-action" type="submit" disabled={busy !== null}>
            <Icon name="plus" />
            {busy === "create" ? "Creating…" : "Create table"}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">I have an invite</h2>
        <form className="auth-form" onSubmit={handleJoin}>
          <label className="field" htmlFor="first-run-code">
            <span>Six- or eight-character code</span>
            <input
              id="first-run-code"
              name="inviteCode"
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="ABC12345"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              pattern="[A-Za-z0-9]{6,8}"
              maxLength={8}
              required
            />
          </label>
          <button className="secondary-action" type="submit" disabled={busy !== null}>
            <Icon name="log-in" />
            {busy === "join" ? "Joining…" : "Join table"}
          </button>
        </form>
      </section>

      {inactiveGroups && inactiveGroups.length > 0 ? (
        <section className="panel">
          <h2 className="panel-title">Archived tables</h2>
          <p className="panel-copy">Restore a table to bring it back for every member.</p>
          {restoreError ? (
            <p className="form-error" role="alert">
              {restoreError}
            </p>
          ) : null}
          <ul className="ledger-rows" role="list">
            {inactiveGroups.map((inactive) => (
              <li className="ledger-row" key={inactive.id}>
                <div className="row-main">
                  <span className="row-title">{inactive.name}</span>
                  <span className="row-sub">
                    {inactive.status === "archived" ? "Archived" : "Deleted"}
                  </span>
                </div>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => void handleRestore(inactive.id)}
                  disabled={restoreBusyId === inactive.id}
                  aria-label={`Restore ${inactive.name}`}
                >
                  <Icon name="restore" />
                  {restoreBusyId === inactive.id ? "Restoring…" : "Restore"}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <button className="text-action" type="button" onClick={() => void signOut()}>
        <Icon name="log-out" />
        Sign out
      </button>
    </div>
  );
}
