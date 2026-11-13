import { SPIRIT_LABELS, type SpiritFilter } from "../lib/bar";
import { cx } from "../lib/cx";
import styles from "./spirit-tabs.module.css";

interface SpiritTabsProps {
  tabs: SpiritFilter[];
  value: SpiritFilter;
  onChange: (filter: SpiritFilter) => void;
}

/** All · Vodka · Tequila · … as underlined text tabs, scrolling past the screen edge. */
export function SpiritTabs({ tabs, value, onChange }: SpiritTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Spirit">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={tab === value}
          className={cx(styles.tab, tab === value && styles.active)}
          onClick={() => onChange(tab)}
        >
          {tab === "all" ? "All" : SPIRIT_LABELS[tab]}
        </button>
      ))}
    </div>
  );
}
