import { useEffect, useId, useRef, type PointerEvent, type ReactNode } from "react";
import { Icon } from "./Icon";

export function Sheet({
  open,
  onClose,
  title,
  children
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const pressedOutside = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.show();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function outside(dialog: HTMLDialogElement, event: PointerEvent<HTMLDialogElement>) {
    const rect = dialog.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  function handlePointerDown(event: PointerEvent<HTMLDialogElement>) {
    pressedOutside.current = outside(event.currentTarget, event);
  }

  function handlePointerUp(event: PointerEvent<HTMLDialogElement>) {
    const dialog = event.currentTarget;
    const dismiss =
      pressedOutside.current && outside(dialog, event) && typeof dialog.close === "function";
    pressedOutside.current = false;
    if (dismiss) dialog.close();
  }

  return (
    <dialog
      ref={dialogRef}
      className="sheet"
      aria-labelledby={titleId}
      {...({ closedby: "any" } as Record<string, string>)}
      onClose={onClose}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      <div className="sheet-head">
        <h2 className="sheet-title" id={titleId}>
          {title}
        </h2>
        <button className="icon-action" type="button" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
