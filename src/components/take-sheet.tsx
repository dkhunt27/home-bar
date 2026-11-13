import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTakeCapsule } from "../hooks/use-bar-mutations";
import type { ShelfItem } from "../lib/bar";
import { friendlyError } from "../lib/errors";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import type { TakeCapsuleResultType } from "../types";
import { CapsuleTile } from "./capsule-tile";
import styles from "./take-sheet.module.css";
import ui from "./ui.module.css";

interface TakeSheetProps {
  item: ShelfItem;
  onClose: () => void;
  onTaken: (result: TakeCapsuleResultType) => void;
}

/** "Take one Old Fashioned?" confirmation, from the Detail footer or a list row's Take. */
export function TakeSheet({ item, onClose, onTaken }: TakeSheetProps) {
  const take = useTakeCapsule();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { capsule, qty } = item;

  // Behaves like a modal: Escape closes, the page behind doesn't scroll, focus moves in.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    sheetRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const confirm = () => {
    take.mutate(capsule.id, { onSuccess: onTaken });
  };
  // Someone poured the last one first: nothing left to retry. Other errors (offline) can.
  const soldOut = take.error?.message === "out_of_stock";

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
        aria-labelledby="take-sheet-title"
        tabIndex={-1}
      >
        <div className={styles.grabber} aria-hidden="true" />
        <div className={styles.summary}>
          <CapsuleTile
            src={sizedImage(capsule.img_box, IMAGE_WIDTH.sheet)}
            size={84}
            radius={18}
            inset={4}
            eager
          />
          <div className={styles.text}>
            <h2 id="take-sheet-title" className={styles.title}>
              Take one {capsule.name}?
            </h2>
            <p className={styles.sub}>Leaves {Math.max(0, qty - 1)} in the bar</p>
          </div>
        </div>
        {take.isError && <p className={ui.errorText}>{friendlyError(take.error)}</p>}
        <div className={styles.buttons}>
          <button type="button" className={styles.cancel} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.confirm}
            onClick={confirm}
            disabled={take.isPending || soldOut}
          >
            Yes, pour it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
