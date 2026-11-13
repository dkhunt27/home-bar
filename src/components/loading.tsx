import styles from "./loading.module.css";

/** Blank screen in the background color while data loads (usually a blink). The dot only
 * fades in after a beat, so a fast load never flashes anything. */
export function Loading() {
  return (
    <div className={styles.loading} aria-busy="true">
      <span className={styles.dot} />
      <span className="visually-hidden">Loading</span>
    </div>
  );
}
