import { useRegisterSW } from "virtual:pwa-register/react";
import styles from "./pwa-update-prompt.module.css";

/** Installed apps can stay open for days; check for a new deploy this often. */
const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker (vite.config.ts, VitePWA) and, when a new deploy has been
 * downloaded, asks before switching to it rather than reloading out from under a pour.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => {
        // Skip while offline; the check would just fail.
        if (navigator.onLine) void registration.update();
      }, UPDATE_CHECK_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className={styles.toast} role="status">
      <span className={styles.message}>A new version is ready.</span>
      <button type="button" className={styles.later} onClick={() => setNeedRefresh(false)}>
        Later
      </button>
      <button type="button" className={styles.reload} onClick={() => updateServiceWorker(true)}>
        Reload
      </button>
    </div>
  );
}
