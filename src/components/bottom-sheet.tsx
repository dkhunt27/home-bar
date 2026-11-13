import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import styles from "./bottom-sheet.module.css";

interface BottomSheetProps {
  /** The id of the sheet's title, for the dialog's accessible name. */
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}

/** The design's bottom sheet (Take one, Add a box, Best-by date): scrim, grabber, slide-up.
 * Behaves like a modal: Escape or a tap on the scrim closes it, the page behind doesn't
 * scroll, focus moves in. The content atoms (summary, title, buttons) are in the same CSS
 * module, for the sheets to share. */
export function BottomSheet({ labelledBy, onClose, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  // Callers pass an inline onClose. Through a ref, a parent re-render (a realtime refetch)
  // doesn't re-run the effect below, which would pull focus out of the date field mid-edit.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return createPortal(
    <div className={styles.scrim}>
      <button
        type="button"
        className={styles.backdrop}
        onClick={onClose}
        aria-label="Cancel"
        tabIndex={-1}
      />
      <div
        ref={sheetRef}
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
