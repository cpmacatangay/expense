import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/authContext";
import { useGroup } from "./groupContext";
import { getErrorMessage } from "@/lib/errors";

export function GroupSetupPage() {
  const { profile, createGroup, joinGroup } = useGroup();
  const { signOut } = useAuth();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="onboarding onboarding--stack">
      <header className="page-head">
        <h1 className="page-title">Start or join a table</h1>
        <p className="page-sub">
          Signed in as {profile?.display_name ?? "your account"}. Groups are 2 to 12 adults.
        </p>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="panel">
        <span className="panel-label">Create</span>
        <h2 className="panel-title">Start a group</h2>
        <form className="auth-form" onSubmit={handleCreate}>
          <label className="field">
            <span>Group name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Salo Crew"
              maxLength={60}
              required
            />
          </label>
          <button className="primary-action" type="submit" disabled={busy !== null || name.trim().length < 2}>
            Create group
          </button>
        </form>
      </section>

      <section className="panel">
        <span className="panel-label">Join</span>
        <h2 className="panel-title">I have an invite</h2>
        <form className="auth-form" onSubmit={handleJoin}>
          <label className="field">
            <span>Six-character code</span>
            <input
              type="text"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={6}
              required
            />
          </label>
          <button className="secondary-action" type="submit" disabled={busy !== null || code.trim().length !== 6}>
            Join group
          </button>
        </form>
      </section>

      <button className="text-action" type="button" onClick={() => void signOut()}>
        Sign out
      </button>
    </main>
  );
}
