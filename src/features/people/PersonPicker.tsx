import { Icon } from "@/ui/primitives/Icon";
import type { Person } from "./types";

export function PersonPicker({
  people,
  selected,
  onChange,
  onAdd
}: {
  people: Person[];
  selected: string[];
  onChange: (next: string[]) => void;
  onAdd?: () => void;
}) {
  function toggle(personId: string) {
    onChange(
      selected.includes(personId)
        ? selected.filter((id) => id !== personId)
        : [...selected, personId]
    );
  }

  return (
    <div className="stack">
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
              {person.status === "pending" ? (
                <span className="status-chip">Not joined</span>
              ) : null}
              {isOn ? <Icon name="check" size={14} /> : null}
            </button>
          );
        })}
      </div>
      {onAdd ? (
        <button className="text-action" type="button" onClick={onAdd}>
          <Icon name="user-plus" />
          Add someone by name
        </button>
      ) : null}
    </div>
  );
}
