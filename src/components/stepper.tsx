import type { ReactNode } from "react";
import styles from "./stepper.module.css";

interface StepperProps {
  onDecrement: () => void;
  onIncrement: () => void;
  /** 40px circles (detail shelf count, alert threshold) or 38px (Manage shelf rows). */
  size: 40 | 38;
  /** What's being counted, for screen readers: "Manhattan", "Low-stock alert". */
  label: string;
  decrementDisabled?: boolean;
  incrementDisabled?: boolean;
  /** The number between the buttons, styled by the caller. */
  children: ReactNode;
}

/** − n + */
export function Stepper({
  onDecrement,
  onIncrement,
  size,
  label,
  decrementDisabled,
  incrementDisabled,
  children,
}: StepperProps) {
  return (
    <>
      <button
        type="button"
        className={size === 40 ? styles.button40 : styles.button38}
        onClick={onDecrement}
        disabled={decrementDisabled}
        aria-label={`${label}: one fewer`}
      >
        −
      </button>
      {children}
      <button
        type="button"
        className={size === 40 ? styles.button40 : styles.button38}
        onClick={onIncrement}
        disabled={incrementDisabled}
        aria-label={`${label}: one more`}
      >
        +
      </button>
    </>
  );
}
