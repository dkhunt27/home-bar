import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import styles from "./screen.module.css";

interface ScreenProps {
  /** Vertical gap between direct children, per the design (Bar 18, Activity 20, ...). */
  gap: number;
  /** Leaves room at the bottom for the tab bar (Bar, Activity, Manage). */
  withNav?: boolean;
  className?: string;
  children: ReactNode;
}

/** A screen's scroll column: the design's `56px 20px 28px` padding, safe-area aware. */
export function Screen({ gap, withNav, className, children }: ScreenProps) {
  return (
    <main className={cx(styles.screen, withNav && styles.withNav, className)} style={{ gap }}>
      {children}
    </main>
  );
}
