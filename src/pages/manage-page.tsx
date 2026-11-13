import { useState } from "react";
import { Link } from "react-router-dom";
import { AddBoxSheet, type AddBoxTarget } from "../components/add-box-sheet";
import { CapsuleTile } from "../components/capsule-tile";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Screen } from "../components/screen";
import { Stepper } from "../components/stepper";
import ui from "../components/ui.module.css";
import { useBoxes, useShelf } from "../hooks/use-bar-data";
import { useAdjustStock, useSetLowThreshold } from "../hooks/use-bar-mutations";
import { useNow } from "../hooks/use-now";
import {
  BOX_SIZE,
  LOW_THRESHOLD_MAX,
  LOW_THRESHOLD_MIN,
  lowItems,
  SPIRIT_LABELS,
  statusShort,
} from "../lib/bar";
import { cx } from "../lib/cx";
import { expirySummary, hasPastBestBy } from "../lib/expiry";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { capsuleRoute, collectionsForRoute, ROUTES } from "../routes";
import styles from "./manage-page.module.css";

export default function ManagePage() {
  const { shelf, threshold, isPending, error } = useShelf();
  const boxes = useBoxes();
  const now = useNow();
  const setThreshold = useSetLowThreshold();
  const adjust = useAdjustStock();
  const [adding, setAdding] = useState<AddBoxTarget | null>(null);

  if (error) return <LoadError error={error} />;
  if (isPending) return <Loading />;

  const low = lowItems(shelf);

  return (
    <Screen gap={22} withNav>
      <header className={styles.header}>
        <div className={styles.headerText}>
          <h1 className={ui.screenTitle}>Manage</h1>
          <p className={ui.screenSubtitle}>Restock, edit counts, set alerts</p>
        </div>
        <Link to={ROUTES.MANAGE_ADD} className={styles.addButton}>
          + Add capsule
        </Link>
      </header>

      <div className={styles.alertCard}>
        <div className={styles.alertText}>
          <span className={styles.alertTitle}>Low-stock alert</span>
          <span className={ui.rowMeta}>Notify me at {threshold} or fewer</span>
        </div>
        <Stepper
          size={40}
          label="Low-stock alert"
          onDecrement={() => setThreshold.mutate(threshold - 1)}
          onIncrement={() => setThreshold.mutate(threshold + 1)}
          decrementDisabled={threshold <= LOW_THRESHOLD_MIN}
          incrementDisabled={threshold >= LOW_THRESHOLD_MAX}
        >
          <span className={styles.thresholdValue}>{threshold}</span>
        </Stepper>
      </div>

      <Link to={ROUTES.MANAGE_GUEST_LINK} className={styles.alertCard}>
        <span className={styles.alertText}>
          <span className={styles.alertTitle}>Guest link</span>
          <span className={ui.rowMeta}>The QR code guests scan to join</span>
        </span>
        <span className={styles.cardAction}>Show →</span>
      </Link>

      {/* Best-by dates are a side line here: if they fail to load, the card just says less. */}
      <Link to={ROUTES.MANAGE_EXPIRING} className={styles.alertCard}>
        <span className={styles.alertText}>
          <span className={styles.alertTitle}>Expiring</span>
          <span
            className={cx(ui.rowMeta, boxes.data && hasPastBestBy(boxes.data, now) && styles.low)}
          >
            {boxes.data ? expirySummary(boxes.data, now) : "Best-by dates, soonest first"}
          </span>
        </span>
        <span className={styles.cardAction}>Show →</span>
      </Link>

      {low.length > 0 && (
        <section className={styles.section}>
          <h2 className={cx(ui.sectionLabel, ui.lowText)}>Running low · {low.length}</h2>
          {low.map((item) => (
            <div key={item.capsule.id} className={ui.listRow}>
              <CapsuleTile
                src={sizedImage(item.capsule.img_box, IMAGE_WIDTH.thumb)}
                size={46}
                radius={12}
                inset={3}
              />
              <div className={ui.rowText}>
                <span className={ui.rowName}>{item.capsule.name}</span>
                <span className={cx(ui.rowMeta, ui.lowText)}>{statusShort(item)}</span>
              </div>
              {item.capsule.sold_single ? (
                <button
                  type="button"
                  className={ui.pillOutline}
                  onClick={() =>
                    setAdding({ kind: "capsule", capsule: item.capsule, qty: item.qty })
                  }
                  aria-label={`Add a box of ${item.capsule.name}`}
                >
                  +{BOX_SIZE} box
                </button>
              ) : (
                <Link
                  to={collectionsForRoute(item.capsule.name)}
                  className={cx(ui.pillOutline, styles.pillLink)}
                  aria-label={`Collections with ${item.capsule.name}`}
                >
                  Collections
                </Link>
              )}
            </div>
          ))}
        </section>
      )}

      <section className={styles.section}>
        <h2 className={ui.sectionLabel}>Shelf · {shelf.length} cocktails</h2>
        {shelf.map((item) => {
          const tone = item.status === "low" && styles.low;
          return (
            <div key={item.capsule.id} className={ui.listRow}>
              <Link to={capsuleRoute(item.capsule.id)} className={styles.shelfLink}>
                <CapsuleTile
                  src={sizedImage(item.capsule.img_box, IMAGE_WIDTH.thumb)}
                  alt={item.capsule.name}
                  size={46}
                  radius={12}
                  inset={3}
                />
                <span className={ui.rowText}>
                  <span className={ui.rowName}>{item.capsule.name}</span>
                  <span className={cx(ui.rowMeta, tone)}>{SPIRIT_LABELS[item.capsule.spirit]}</span>
                </span>
              </Link>
              <Stepper
                size={38}
                label={item.capsule.name}
                onDecrement={() => adjust.mutate({ capsuleId: item.capsule.id, delta: -1 })}
                onIncrement={() => adjust.mutate({ capsuleId: item.capsule.id, delta: 1 })}
                decrementDisabled={item.qty === 0}
              >
                <span className={cx(styles.shelfQty, tone)}>{item.qty}</span>
              </Stepper>
            </div>
          );
        })}
      </section>

      {adding && <AddBoxSheet target={adding} onClose={() => setAdding(null)} />}
    </Screen>
  );
}
