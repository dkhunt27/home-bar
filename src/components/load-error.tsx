import { useQueryClient } from "@tanstack/react-query";
import { friendlyError } from "../lib/errors";
import styles from "./load-error.module.css";
import ui from "./ui.module.css";

/** A screen's data didn't load (usually the phone's offline). Retry in place. */
export function LoadError({ error }: { error: unknown }) {
  const queryClient = useQueryClient();
  return (
    <main className={styles.screen}>
      <p className={styles.title}>Couldn't reach the bar.</p>
      <p className={styles.detail}>{friendlyError(error)}</p>
      <button
        type="button"
        className={ui.primaryButton}
        onClick={() => void queryClient.refetchQueries({ type: "active" })}
      >
        Try again
      </button>
    </main>
  );
}
