import { useState } from "react";
import { getErrorMessage } from "@/lib/errors";
import { Sheet } from "@/ui/primitives/Sheet";
import { Icon } from "@/ui/primitives/Icon";
import { addPerson } from "./api";
import type { AddPersonResult } from "./types";

export function AddPersonSheet({
  open,
  onClose,
  onAdded
}: {
  open: boolean;
  onClose: () => void;
  onAdded: (result: AddPersonResult) => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setName("");
    setBusy(false);
    setError(null);
    onClose();
  }

  async function handleAdd() {
    const next = name.trim();
    if (!next) {
      setError("Enter a name");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const result = await addPerson(next);
      onAdded(result);
      close();
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not add that person"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={close} title="Add a person">
      <div className="stack">
        <p className="panel-copy">
          Add their name now. After you save, share the expense link so they can claim their
          name and see their share.
        </p>
        <label className="field">
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Mai"
            maxLength={50}
            autoCapitalize="words"
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
    </Sheet>
  );
}
