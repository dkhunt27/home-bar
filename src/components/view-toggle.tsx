import type { ViewMode } from "../hooks/use-view-mode";
import { cx } from "../lib/cx";
import styles from "./view-toggle.module.css";

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

/** Grid / list switch on the Bar toolbar. The icons are plain CSS shapes, per the design. */
export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <fieldset className={styles.toggle} aria-label="Layout">
      <button
        type="button"
        className={cx(styles.button, value === "grid" && styles.active)}
        onClick={() => onChange("grid")}
        aria-pressed={value === "grid"}
        aria-label="Grid"
      >
        <span className={styles.gridIcon}>
          <span />
          <span />
          <span />
          <span />
        </span>
      </button>
      <button
        type="button"
        className={cx(styles.button, value === "list" && styles.active)}
        onClick={() => onChange("list")}
        aria-pressed={value === "list"}
        aria-label="List"
      >
        <span className={styles.listIcon}>
          <span />
          <span />
          <span />
        </span>
      </button>
    </fieldset>
  );
}
