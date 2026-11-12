import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/authContext";
import { listInactiveOwnedGroups, restoreGroup } from "./lifecycle";
import { useGroup } from "./groupContext";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";

export function GroupSetupPage() {
  const { profile, createGroup, joinGroup, refresh } = useGroup();
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restoreBusy, setRestoreBusy] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  usePageTitle("Start or join a table");

  const { data: inactiveGroups } = useQuery({
    queryKey: ["inactive-groups", user?.id],
    queryFn: listInactiveOwnedGroups,
    enabled: Boolean(user)
  });

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy("create");
    setError(null);
    try {
      await createGroup(name.trim());
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create the group"));
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
      setError(getErrorMessage(caught, "Could not join the group"));
      setBusy(null);
    }
  }

  async function handleRestoreGroup(groupId: string) {
    setRestoreBusy(groupId);
    setRestoreError(null);
    try {
      await restoreGroup(groupId);
      await queryClient.invalidateQueries({ queryKey: ["inactive-groups", user?.id] });
      await refresh();
    } catch (caught) {
      setRestoreError(getErrorMessage(caught, "Could not restore the group"));
    } finally {
      setRestoreBusy(null);
    }
  }

  return (
    <main className="onboarding onboarding--stack">
      <BrandMark className="onboarding-mark" />
      <header className="page-head">
        <h1 className="page-title">Start or join a table</h1>
        <p className="page-sub">
          Signed in as {profile?.display_name ?? "your account"}. Groups are 2 to 12 adults.
        </p>
      </header>

      {error ? (
        <p className="form-error" role="alert" id="group-error">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <h2 className="panel-title">Start a group</h2>
        <form className="auth-form" onSubmit={handleCreate} aria-labelledby="start-group-title">
          <label className="field" htmlFor="group-name">
            <span>Group name</span>
            <input
              id="group-name"
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
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "group-error" : undefined}
              required
            />
          </label>
          <button className="primary-action" type="submit" disabled={busy !== null}>
            <Icon name="plus" />
            Create group
          </button>
        </form>
      </section>

      <section className="panel">
        <h2 className="panel-title">I have an invite</h2>
        <form className="auth-form" onSubmit={handleJoin}>
          <label className="field" htmlFor="group-code">
            <span>Six-character code</span>
            <input
              id="group-code"
              name="inviteCode"
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                if (error) setError(null);
              }}
              placeholder="ABC123"
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              pattern="[A-Za-z0-9]{6}"
              maxLength={6}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "group-error" : undefined}
              required
            />
          </label>
          <button className="secondary-action" type="submit" disabled={busy !== null}>
            <Icon name="log-in" />
            Join group
          </button>
        </form>
      </section>

      {inactiveGroups && inactiveGroups.length > 0 ? (
        <section className="panel">
          <h2 className="panel-title">Archived and deleted</h2>
          <p className="panel-copy">Restore a group to bring it back for every member.</p>
          {restoreError ? (
            <p className="form-error" role="alert">
              {restoreError}
            </p>
          ) : null}
          <ul className="ledger-rows">
            {inactiveGroups.map((inactive) => (
              <li className="ledger-row" key={inactive.id}>
                <div className="row-main">
                  <span className="row-title">{inactive.name}</span>
                  <span className="row-sub">
                    {inactive.status === "archived"
                      ? "Archived"
                      : `Deleted${
                          inactive.deleted_at
                            ? ` ${formatDate(inactive.deleted_at.slice(0, 10))}`
                            : ""
                        }`}
                  </span>
                </div>
                <button
                  className="text-action"
                  type="button"
                  onClick={() => void handleRestoreGroup(inactive.id)}
                  disabled={restoreBusy === inactive.id}
                >
                  <Icon name="restore" />
                  {restoreBusy === inactive.id ? "Restoring…" : "Restore"}
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
    </main>
  );
}
