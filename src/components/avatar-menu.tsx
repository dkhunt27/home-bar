import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import styles from "./avatar-menu.module.css";

/** The initial in the Bar header's corner. Opens a small menu rather than signing out on
 * the first tap, so a stray touch doesn't kick a guest out mid-party. */
export function AvatarMenu() {
  const { me, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!me) return null;

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.avatar}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Signed in as ${me.name}`}
      >
        {me.name.charAt(0).toUpperCase()}
      </button>
      {open && (
        <>
          <button
            type="button"
            className={styles.dismiss}
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            tabIndex={-1}
          />
          <div className={styles.menu} role="menu">
            <p className={styles.who}>
              {me.name}
              <span className={styles.role}>{me.role === "owner" ? "Owner" : "Guest"}</span>
            </p>
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => void signOut()}
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
