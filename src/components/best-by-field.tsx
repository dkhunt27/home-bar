import { useId } from "react";
import { cx } from "../lib/cx";
import styles from "./bottom-sheet.module.css";
import ui from "./ui.module.css";

interface BestByFieldProps {
  /** "2027-01-15", or "" for no date. */
  value: string;
  onChange: (value: string) => void;
}

/** The best-by date in the Add a box and Best-by date sheets. Optional: a box without one
 * still goes on the shelf, it just lands under "No date" on the Expiring screen. */
export function BestByField({ value, onChange }: BestByFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <div className={styles.fieldHead}>
        <label htmlFor={id} className={styles.fieldLabel}>
          Best by
        </label>
        {/* Not every date picker has its own clear button (iOS's wheel doesn't). */}
        {value && (
          <button type="button" className={styles.clear} onClick={() => onChange("")}>
            Clear
          </button>
        )}
      </div>
      <input
        id={id}
        type="date"
        className={cx(ui.input, styles.dateInput)}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={styles.hint}>The date printed on the box. Leave it blank if there isn't one.</p>
    </div>
  );
}
