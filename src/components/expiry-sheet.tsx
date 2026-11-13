import { useState } from "react";
import { useSetBoxExpiry } from "../hooks/use-bar-mutations";
import type { ExpiringRow } from "../lib/expiry";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { BestByField } from "./best-by-field";
import { BottomSheet } from "./bottom-sheet";
import styles from "./bottom-sheet.module.css";
import { CapsuleTile } from "./capsule-tile";

interface ExpirySheetProps {
  row: ExpiringRow;
  onClose: () => void;
}

/** The Expiring screen's edit: fix a box's best-by date, or give one to a box that has none
 * (stock from before dates were tracked). Optimistic: the row moves as the sheet closes. */
export function ExpirySheet({ row, onClose }: ExpirySheetProps) {
  const setExpiry = useSetBoxExpiry();
  const initial = row.box.expires_on ?? "";
  const [value, setValue] = useState(initial);

  const save = () => {
    setExpiry.mutate({ boxId: row.box.id, expiresOn: value || null });
    onClose();
  };

  return (
    <BottomSheet labelledBy="expiry-sheet-title" onClose={onClose}>
      <div className={styles.summary}>
        <CapsuleTile
          src={sizedImage(row.capsule.img_box, IMAGE_WIDTH.sheet)}
          size={84}
          radius={18}
          inset={4}
          eager
        />
        <div className={styles.text}>
          <h2 id="expiry-sheet-title" className={styles.title}>
            {row.capsule.name}
          </h2>
          <p className={styles.sub}>
            {row.box.qty} left{row.collection ? ` · ${row.collection.name}` : ""}
          </p>
        </div>
      </div>
      <BestByField value={value} onChange={setValue} />
      <div className={styles.buttons}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.confirm}
          onClick={save}
          disabled={value === initial}
        >
          Save
        </button>
      </div>
    </BottomSheet>
  );
}
