import { useEffect, useRef, useState } from "react";
import { formatPeso } from "@/domain/money/format";
import { Icon } from "@/ui/primitives/Icon";
import { centsToInput, isAmountInput, parseAmountInput } from "./amountInput";
import { SplitItemSheet } from "./SplitItemSheet";
import type { SaveExpenseItem } from "./types";

export type ExpenseItemDraft = SaveExpenseItem & { key: string };

function newItemKey() {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function AmountField({
  centavos,
  onChange
}: {
  centavos: number;
  onChange: (centavos: number) => void;
}) {
  const [text, setText] = useState(() => centsToInput(centavos));
  const lastEmitted = useRef(centavos);

  useEffect(() => {
    if (centavos === lastEmitted.current) return;
    lastEmitted.current = centavos;
    setText(centsToInput(centavos));
  }, [centavos]);

  return (
    <label className="field">
      <span>Amount</span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          if (!isAmountInput(next)) return;
          setText(next);
          const cents = parseAmountInput(next);
          lastEmitted.current = cents;
          onChange(cents);
        }}
        onBlur={() => setText(centsToInput(centavos))}
        placeholder="0.00"
      />
    </label>
  );
}

export function ItemEditor({
  items,
  people,
  defaultPersonId,
  onChange
}: {
  items: ExpenseItemDraft[];
  people: { id: string; displayName: string }[];
  defaultPersonId: string;
  onChange: (next: ExpenseItemDraft[]) => void;
}) {
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [forPersonId, setForPersonId] = useState(
    defaultPersonId || people[0]?.id || ""
  );
  const [forTouched, setForTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitOpen, setSplitOpen] = useState(false);
  const nameRef = useRef<HTMLInputElement | null>(null);
  const amountRef = useRef<HTMLInputElement | null>(null);

  // Follow the payer until the person picks someone themselves.
  useEffect(() => {
    if (forTouched) return;
    if (defaultPersonId && people.some((person) => person.id === defaultPersonId)) {
      setForPersonId(defaultPersonId);
    }
  }, [defaultPersonId, forTouched, people]);

  // If the selected person leaves the expense, fall back to the payer.
  useEffect(() => {
    if (people.some((person) => person.id === forPersonId)) return;
    const fallback =
      defaultPersonId && people.some((person) => person.id === defaultPersonId)
        ? defaultPersonId
        : people[0]?.id ?? "";
    setForPersonId(fallback);
  }, [people, forPersonId, defaultPersonId]);

  const totalCentavos = items.reduce((sum, item) => sum + item.amountCentavos, 0);
  const summary = `${items.length} ${items.length === 1 ? "item" : "items"} · ${formatPeso(
    totalCentavos
  )}`;

  function update(key: string, patch: Partial<SaveExpenseItem>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function addItem() {
    const trimmed = name.trim();
    const cents = parseAmountInput(amountText);

    if (!trimmed) {
      setError("Enter an item name.");
      nameRef.current?.focus();
      return;
    }
    if (cents <= 0) {
      setError("Enter an amount greater than zero.");
      amountRef.current?.focus();
      return;
    }
    if (!forPersonId) {
      setError("Choose who this was for.");
      return;
    }
    if (items.length >= 50) {
      setError("An expense can have up to 50 items.");
      return;
    }

    onChange([
      ...items,
      {
        key: newItemKey(),
        name: trimmed,
        amountCentavos: cents,
        assignedPersonId: forPersonId
      }
    ]);
    setName("");
    setAmountText("");
    setError(null);
    setForTouched(true);
    nameRef.current?.focus();
  }

  function addSplitItems(nextItems: SaveExpenseItem[]) {
    onChange([
      ...items,
      ...nextItems.map((item) => ({ ...item, key: newItemKey() }))
    ]);
    setName("");
    setAmountText("");
    setError(null);
    setSplitOpen(false);
    requestAnimationFrame(() => nameRef.current?.focus());
  }

  return (
    <div className="item-editor">
      <div className="section-head">
        <h2 className="panel-title">Items</h2>
        <span className="items-summary" aria-live="polite">
          {summary}
        </span>
      </div>

      <div className="item-composer">
        <label className="field">
          <span>Item</span>
          <input
            ref={nameRef}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            placeholder="What was it?"
            maxLength={120}
            autoCapitalize="words"
            enterKeyHint="next"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              amountRef.current?.focus();
            }}
          />
        </label>
        <div className="item-composer-row">
          <label className="field">
            <span>Amount</span>
            <input
              ref={amountRef}
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
              enterKeyHint="done"
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                addItem();
              }}
            />
          </label>
          <label className="field">
            <span>For</span>
            <select
              value={forPersonId}
              onChange={(event) => {
                setForTouched(true);
                setForPersonId(event.target.value);
                if (error) setError(null);
              }}
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-action item-composer-add" type="button" onClick={addItem}>
            <Icon name="plus" />
            Add
          </button>
        </div>
        <div className="item-composer-actions">
          <button className="text-action" type="button" onClick={() => setSplitOpen(true)}>
            <Icon name="users" />
            Split equally
          </button>
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {items.length > 0 ? (
        <div className="item-editor-list">
          {items.map((item, index) => (
            <div className="item-edit-row" key={item.key}>
              <label className="field item-edit-name">
                <span>Item</span>
                <input
                  value={item.name}
                  onChange={(event) => update(item.key, { name: event.target.value })}
                  placeholder="What was it?"
                  maxLength={120}
                />
              </label>
              <AmountField
                centavos={item.amountCentavos}
                onChange={(amountCentavos) => update(item.key, { amountCentavos })}
              />
              <label className="field">
                <span>For</span>
                <select
                  value={item.assignedPersonId}
                  onChange={(event) =>
                    update(item.key, { assignedPersonId: event.target.value })
                  }
                >
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>
                      {person.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="icon-action item-edit-remove"
                type="button"
                aria-label={`Remove ${item.name || `item ${index + 1}`}`}
                onClick={() => onChange(items.filter((entry) => entry.key !== item.key))}
              >
                <Icon name="trash" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {splitOpen ? (
        <SplitItemSheet
          open
          initialName={name}
          initialAmountCentavos={parseAmountInput(amountText)}
          people={people}
          existingCount={items.length}
          onClose={() => setSplitOpen(false)}
          onAdd={addSplitItems}
        />
      ) : null}
    </div>
  );
}
