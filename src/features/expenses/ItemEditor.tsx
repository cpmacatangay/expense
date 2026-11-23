import { useEffect, useRef, useState } from "react";
import { Icon } from "@/ui/primitives/Icon";
import type { SaveExpenseItem } from "./types";

export type ExpenseItemDraft = SaveExpenseItem & { key: string };

function centsToInput(centavos: number) {
  return centavos > 0 ? (centavos / 100).toFixed(2) : "";
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
          // Keep partial input like "12." and "0.5" editable.
          if (!/^\d*(?:\.\d{0,2})?$/.test(next)) return;
          setText(next);
          const parsed = Math.round(Number(next || "0") * 100);
          const cents = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
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
  onChange
}: {
  items: ExpenseItemDraft[];
  people: { id: string; displayName: string }[];
  onChange: (next: ExpenseItemDraft[]) => void;
}) {
  function update(key: string, patch: Partial<SaveExpenseItem>) {
    onChange(items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  return (
    <div className="item-editor">
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
            disabled={items.length <= 1}
          >
            <Icon name="trash" />
          </button>
        </div>
      ))}
      <button
        className="text-action item-edit-add"
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
              key: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: "",
              amountCentavos: 0,
              assignedPersonId: people[0]?.id ?? ""
            }
          ])
        }
        disabled={items.length >= 50}
      >
        <Icon name="plus" />
        Add item
      </button>
    </div>
  );
}
