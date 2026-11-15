import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { getErrorMessage } from "@/lib/errors";
import { Icon } from "@/ui/primitives/Icon";
import { Sheet } from "@/ui/primitives/Sheet";
import { useGroup } from "./groupContext";

export function GroupSwitcher({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { group, groups, selectGroup, createGroup, joinGroup } = useGroup();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | "select" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(groupId: string) {
    if (groupId === group?.id) {
      onClose();
      return;
    }
    setBusy("select");
    setError(null);
    try {
      await selectGroup(groupId);
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not switch tables"));
    } finally {
      setBusy(null);
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setBusy("create");
    setError(null);
    try {
      await createGroup(name.trim());
      setName("");
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not create the table"));
    } finally {
      setBusy(null);
    }
  }

  async function handleJoin(event: FormEvent) {
    event.preventDefault();
    setBusy("join");
    setError(null);
    try {
      await joinGroup(code.trim().toUpperCase());
      setCode("");
      onClose();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not join the table"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Your tables">
      {groups.length > 0 ? (
        <ul className="ledger-rows" role="list">
          {groups.map((entry) => (
            <li key={entry.id}>
              <button
                className="switcher-row"
                type="button"
                onClick={() => void handleSelect(entry.id)}
                disabled={busy !== null}
                aria-current={entry.id === group?.id ? "true" : undefined}
              >
                <span className="row-main">
                  <span className="row-title">{entry.name}</span>
                  <span className="row-sub">
                    {entry.id === group?.id ? "Current table" : "Switch to this table"}
                  </span>
                </span>
                {entry.id === group?.id ? <Icon name="check" size={16} /> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <form className="auth-form" onSubmit={handleCreate}>
        <label className="field" htmlFor="switcher-new-name">
          <span>New table</span>
          <input
            id="switcher-new-name"
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
        <button className="secondary-action" type="submit" disabled={busy !== null}>
          <Icon name="plus" />
          {busy === "create" ? "Creating…" : "Create table"}
        </button>
      </form>

      <form className="auth-form" onSubmit={handleJoin}>
        <label className="field" htmlFor="switcher-join-code">
          <span>Join with a code</span>
          <input
            id="switcher-join-code"
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

      <div className="form-actions">
        <Link className="text-link" to="/settings" onClick={onClose}>
          Manage tables
          <Icon name="arrow-right" />
        </Link>
      </div>
    </Sheet>
  );
}
