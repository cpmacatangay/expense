import { useEffect, useState } from "react";
import { formatPeso } from "@/domain/money/format";
import { splitEvenly } from "@/domain/money/splitEvenly";
import { getErrorMessage } from "@/lib/errors";
import { Sheet } from "@/ui/primitives/Sheet";
import { Icon } from "@/ui/primitives/Icon";
import { centsToInput, isAmountInput, parseAmountInput } from "./amountInput";
import type { SaveExpenseItem } from "./types";

export function SplitItemSheet({
  open,
  initialName,
  initialAmountCentavos,
  people,
  existingCount,
  onClose,
  onAdd
}: {
  open: boolean;
  initialName: string;
  initialAmountCentavos: number;
  people: { id: string; displayName: string }[];
  existingCount: number;
  onClose: () => void;
  onAdd: (items: SaveExpenseItem[]) => void;
}) {
  const [name, setName] = useState(initialName);
  const [amountText, setAmountText] = useState(centsToInput(initialAmountCentavos));
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setAmountText(centsToInput(initialAmountCentavos));
    setSelected([]);
    setError(null);
  }, [open, initialName, initialAmountCentavos]);

  const totalCentavos = parseAmountInput(amountText);
  const orderedPeople = people.filter((person) => selected.includes(person.id));

  let shares: number[] | null = null;
  let previewError: string | null = null;
  if (orderedPeople.length >= 2 && totalCentavos > 0) {
    try {
      shares = splitEvenly(totalCentavos, orderedPeople.length);
    } catch (caught) {
      previewError = getErrorMessage(caught, "That total cannot be split.");
    }
  }

  function toggle(personId: string) {
    setError(null);
    setSelected((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId]
    );
  }

  function confirm() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Enter a dish name.");
      return;
    }
    if (totalCentavos <= 0) {
      setError("Enter a total greater than zero.");
      return;
    }
    if (orderedPeople.length < 2) {
      setError("Choose at least two people.");
      return;
    }
    if (existingCount + orderedPeople.length > 50) {
      setError("An expense can have up to 50 items.");
      return;
    }

    let parts: number[];
    try {
      parts = splitEvenly(totalCentavos, orderedPeople.length);
    } catch (caught) {
      setError(getErrorMessage(caught, "That total cannot be split."));
      return;
    }

    onAdd(
      orderedPeople.map((person, index) => ({
        name: trimmed,
        amountCentavos: parts[index],
        assignedPersonId: person.id
      }))
    );
    onClose();
  }

  const addLabel =
    orderedPeople.length >= 2
      ? `Add ${orderedPeople.length} items`
      : "Add items";

  return (
    <Sheet open={open} onClose={onClose} title="Split equally">
      <div className="stack">
        <p className="panel-copy">
          Divide a shared dish into one independent line per person. Each line can be edited
          afterwards.
        </p>

        <label className="field">
          <span>Dish name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="Pizza"
            maxLength={120}
            autoCapitalize="words"
          />
        </label>

        <label className="field">
          <span>Total</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amountText}
            onChange={(event) => {
              const next = event.target.value;
              if (!isAmountInput(next)) return;
              setAmountText(next);
              if (error) setError(null);
            }}
            placeholder="0.00"
          />
        </label>

        <fieldset className="split-people">
          <legend>Who shared it?</legend>
          {people.length < 2 ? (
            <p className="panel-copy">Add another person to this expense first.</p>
          ) : (
            <div className="person-list">
              {people.map((person) => {
                const isOn = selected.includes(person.id);
                return (
                  <button
                    key={person.id}
                    className={`person${isOn ? " is-on" : ""}`}
                    type="button"
                    onClick={() => toggle(person.id)}
                    aria-pressed={isOn}
                  >
                    <span className="member-initials">
                      {person.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <span>{person.displayName}</span>
                    {isOn ? <Icon name="check" size={14} /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        {shares && orderedPeople.length >= 2 ? (
          <div className="stack">
            <p className="panel-label">Each line</p>
            <div>
              {orderedPeople.map((person, index) => (
                <div className="share-row" key={person.id}>
                  <span className="row-title">{person.displayName}</span>
                  <span className="amount">{formatPeso(shares[index])}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {previewError ? (
          <p className="form-notice" role="status">
            {previewError}
          </p>
        ) : null}
        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}

        <button className="primary-action" type="button" onClick={confirm}>
          <Icon name="users" />
          {addLabel}
        </button>
      </div>
    </Sheet>
  );
}
