import { Icon } from "@/ui/primitives/Icon";
import type { SaveExpenseItem } from "./types";

export function ItemEditor({
  items,
  people,
  onChange
}: {
  items: SaveExpenseItem[];
  people: { id: string; displayName: string }[];
  onChange: (next: SaveExpenseItem[]) => void;
}) {
  function update(index: number, patch: Partial<SaveExpenseItem>) {
    onChange(items.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  }

  return (
    <div className="stack">
      {items.map((item, index) => (
        <div className="item-row" key={index}>
          <label className="field">
            <span>Item</span>
            <input
              value={item.name}
              onChange={(event) => update(index, { name: event.target.value })}
              placeholder="What was it?"
              maxLength={120}
            />
          </label>
          <label className="field">
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={item.amountCentavos > 0 ? (item.amountCentavos / 100).toFixed(2) : ""}
              onChange={(event) => {
                const amount = Number(event.target.value);
                update(index, {
                  amountCentavos: Number.isFinite(amount)
                    ? Math.max(0, Math.round(amount * 100))
                    : 0
                });
              }}
              placeholder="0.00"
            />
          </label>
          <label className="field">
            <span>For</span>
            <select
              value={item.assignedPersonId}
              onChange={(event) => update(index, { assignedPersonId: event.target.value })}
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.displayName}
                </option>
              ))}
            </select>
          </label>
          <button
            className="icon-action"
            type="button"
            aria-label={`Remove ${item.name || "item"}`}
            onClick={() => onChange(items.filter((_, position) => position !== index))}
            disabled={items.length <= 1}
          >
            <Icon name="trash" />
          </button>
        </div>
      ))}
      <button
        className="text-action"
        type="button"
        onClick={() =>
          onChange([
            ...items,
            {
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
