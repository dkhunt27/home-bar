import { cx } from "../lib/cx";
import styles from "./segmented.module.css";

interface SegmentedProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  /** "block": the sign-in Guest | Owner switch. "pill": the detail Box | Pour switch. */
  variant: "block" | "pill";
  label: string;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  variant,
  label,
}: SegmentedProps<T>) {
  return (
    <fieldset className={styles[variant]} aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={cx(styles.option, option.value === value && styles.active)}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </fieldset>
  );
}
