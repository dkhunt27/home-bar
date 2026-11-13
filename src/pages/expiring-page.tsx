import { useState } from "react";
import { BackButton } from "../components/back-button";
import { CapsuleTile } from "../components/capsule-tile";
import { ExpirySheet } from "../components/expiry-sheet";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Screen } from "../components/screen";
import ui from "../components/ui.module.css";
import { useBoxes, useCapsules, useCollections } from "../hooks/use-bar-data";
import { useNow } from "../hooks/use-now";
import { cx } from "../lib/cx";
import {
  EXPIRY_GROUP_LABELS,
  type ExpiringRow,
  type ExpiryGroup,
  expiringGroups,
  formatBestBy,
  relativeDays,
} from "../lib/expiry";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { ROUTES } from "../routes";
import styles from "./expiring-page.module.css";

const TONE: Record<ExpiryGroup, string | undefined> = {
  past: styles.low,
  soon: styles.soon,
  later: undefined,
  none: undefined,
};

/** Owner only: every box on the shelf, soonest best-by first, so the ones about to turn get
 * poured first. Tap a box to change its date. */
export default function ExpiringPage() {
  const boxes = useBoxes();
  const capsules = useCapsules();
  const collections = useCollections();
  const now = useNow();
  const [editing, setEditing] = useState<ExpiringRow | null>(null);

  const error = boxes.error ?? capsules.error ?? collections.error;
  if (error) return <LoadError error={error} />;
  if (!boxes.data || !capsules.data || !collections.data) return <Loading />;

  const groups = expiringGroups(boxes.data, capsules.data, collections.data, now);

  return (
    <Screen gap={22}>
      <header className={styles.header}>
        <BackButton fallback={ROUTES.MANAGE} />
        <h1 className={styles.title}>Expiring</h1>
      </header>

      <p className={styles.lead}>
        Soonest best-by first. Counts assume that's the order they get poured in; tap a box to
        change its date.
      </p>

      {groups.length === 0 && <p className={ui.emptyState}>Nothing on the shelf yet.</p>}

      {groups.map(({ group, rows }) => (
        <section key={group} className={styles.section}>
          <h2 className={cx(ui.sectionLabel, TONE[group])}>
            {EXPIRY_GROUP_LABELS[group]} · {rows.length}
          </h2>
          {rows.map((row) => (
            <button
              key={row.box.id}
              type="button"
              className={cx(ui.listRow, styles.row)}
              onClick={() => setEditing(row)}
            >
              <CapsuleTile
                src={sizedImage(row.capsule.img_box, IMAGE_WIDTH.thumb)}
                alt={row.capsule.name}
                size={46}
                radius={12}
                inset={3}
              />
              <span className={ui.rowText}>
                <span className={ui.rowName}>{row.capsule.name}</span>
                <span className={ui.rowMeta}>
                  {row.box.qty} left{row.collection ? ` · ${row.collection.name}` : ""}
                </span>
              </span>
              {row.box.expires_on && row.days !== null ? (
                <span className={cx(styles.when, TONE[group])}>
                  <span className={styles.date}>{formatBestBy(row.box.expires_on, now)}</span>
                  <span className={styles.relative}>{relativeDays(row.days)}</span>
                </span>
              ) : (
                <span className={styles.addDate}>Add date</span>
              )}
            </button>
          ))}
        </section>
      ))}

      {editing && <ExpirySheet row={editing} onClose={() => setEditing(null)} />}
    </Screen>
  );
}
