import { useId, type RefObject } from "react";
import { Icon } from "./Icon";

export function FileField({
  label,
  name,
  accept,
  file,
  onSelect,
  hint,
  inputRef
}: {
  label: string;
  name?: string;
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
      <label className={`file-field-control${file ? " has-file" : ""}`}>
        <span className="file-field-icon">
          <Icon name={file ? "check" : "upload"} />
        </span>
        <span className="file-field-body">
          <span className="file-field-name">{file ? file.name : "No file chosen"}</span>
          <span className="file-field-caption" id={hintId}>
            {hint ?? "Tap to browse your files"}
          </span>
        </span>
        <span className="file-field-action">{file ? "Replace" : "Browse"}</span>
        <input
          ref={inputRef}
          className="file-field-input"
          type="file"
          name={name}
          accept={accept}
          aria-label={label}
          aria-describedby={hintId}
          onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
