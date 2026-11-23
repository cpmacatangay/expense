import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { Sheet } from "@/ui/primitives/Sheet";
import { Icon } from "@/ui/primitives/Icon";
import { addPerson, inviteUrl } from "./api";
import type { AddPersonResult } from "./types";

export function AddPersonSheet({
  open,
  onClose,
  onAdded
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (result: AddPersonResult, email: string) => void;
}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<AddPersonResult | null>(null);
  const [copied, setCopied] = useState(false);

  function close() {
    setEmail("");
    setBusy(false);
    setError(null);
    setPending(null);
    setCopied(false);
    onClose();
  }

  async function handleAdd() {
    const next = email.trim().toLowerCase();
    if (!next) {
      setError("Enter an email address");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await addPerson(next);
      onAdded(result, next);
      if (result.status === "pending" && result.inviteToken) {
        setPending(result);
      } else {
        setEmail("");
        close();
      }
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not add that person"));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!pending?.inviteToken) return;
    try {
      await navigator.clipboard.writeText(inviteUrl(pending.inviteToken));
      setCopied(true);
    } catch {
      setError("Could not copy. Select the link and copy it.");
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Add a person">
      {pending?.inviteToken ? (
        <div className="stack">
          <p className="panel-copy">
            Invite link ready. Send it to <strong>{email.trim().toLowerCase()}</strong> in chat.
            They sign in with Google using that email.
          </p>
          <label className="field">
            <span>Invite link</span>
            <input
              readOnly
              value={inviteUrl(pending.inviteToken)}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          <button className="primary-action" type="button" onClick={() => void copyLink()}>
            <Icon name="copy" />
            {copied ? "Copied" : "Copy invite link"}
          </button>
          <button className="text-action" type="button" onClick={close}>
            Done
          </button>
        </div>
      ) : (
        <div className="stack">
          <p className="panel-copy">
            Add an email. Existing Google accounts link immediately; new emails get a link you
            can send in chat.
          </p>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                if (error) setError(null);
              }}
              placeholder="friend@example.com"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleAdd();
              }}
            />
          </label>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <button
            className="primary-action"
            type="button"
            onClick={() => void handleAdd()}
            disabled={busy}
          >
            <Icon name="user-plus" />
            {busy ? "Adding." : "Add person"}
          </button>
        </div>
      )}
    </Sheet>
  );
}
