import { useId, type RefObject } from "react";
import { Icon } from "./Icon";

export function FileField({
  label,
  accept,
  file,
  onSelect,
  hint,
  inputRef
}: {
  label: string;
  accept: string;
  file: File | null;
  onSelect: (file: File | null) => void;
  hint?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const hintId = useId();

  return (
    <div className="file-field">
      <span className="file-field-label">{label}</span>
      <label className="file-field-control">
        <Icon name="upload" />
        <span className="file-field-name">{file ? file.name : "No file chosen"}</span>
        <span className="file-field-action">{file ? "Replace" : "Browse"}</span>
        <input
          ref={inputRef}
          className="file-field-input"
          type="file"
          accept={accept}
          aria-label={label}
          aria-describedby={hint ? hintId : undefined}
          onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
        />
      </label>
      {hint ? (
        <span className="file-field-hint" id={hintId}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
