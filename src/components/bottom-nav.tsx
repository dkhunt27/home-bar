import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";
import { cx } from "../lib/cx";
import { ROUTES } from "../routes";
import styles from "./bottom-nav.module.css";

const TABS = [
  { to: ROUTES.BAR, label: "Bar", ownerOnly: false },
  { to: ROUTES.ACTIVITY, label: "Activity", ownerOnly: false },
  { to: ROUTES.MANAGE, label: "Manage", ownerOnly: true },
];

/** Bar / Activity / Manage (owner only). Rendered by TabLayout, so it only appears on those
 * three screens. */
export function BottomNav() {
  const { isOwner } = useAuth();
  return (
    <nav className={styles.nav} aria-label="Main">
      {TABS.filter((t) => isOwner || !t.ownerOnly).map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end
          replace
          className={({ isActive }) => cx(styles.item, isActive && styles.active)}
        >
          <span className={styles.indicator} aria-hidden="true" />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
