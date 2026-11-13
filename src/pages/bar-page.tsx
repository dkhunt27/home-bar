import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AvatarMenu } from "../components/avatar-menu";
import { CapsuleTile } from "../components/capsule-tile";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Screen } from "../components/screen";
import { SpiritTabs } from "../components/spirit-tabs";
import { TakeSheet } from "../components/take-sheet";
import ui from "../components/ui.module.css";
import { ViewToggle } from "../components/view-toggle";
import { useAuth } from "../hooks/use-auth";
import { useShelf } from "../hooks/use-bar-data";
import { useViewMode } from "../hooks/use-view-mode";
import {
  filterBySpirit,
  filterTitle,
  gridCaption,
  lowItems,
  lowNamesPreview,
  parseSpiritFilter,
  plural,
  qtyPillText,
  type ShelfItem,
  SPIRIT_LABELS,
  type SpiritFilter,
  shelfTotals,
  spiritTabs,
  statusShort,
  visibleShelf,
} from "../lib/bar";
import { cx } from "../lib/cx";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { type CheersState, capsuleRoute, ROUTES } from "../routes";
import type { TakeCapsuleResultType } from "../types";
import styles from "./bar-page.module.css";

export default function BarPage() {
  const { isOwner } = useAuth();
  const { shelf, settings, isPending, error } = useShelf();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useViewMode();
  const [taking, setTaking] = useState<ShelfItem | null>(null);
  const navigate = useNavigate();

  if (error) return <LoadError error={error} />;
  if (isPending) return <Loading />;

  const base = visibleShelf(shelf, isOwner, settings);
  const tabs = spiritTabs(base);
  // The filter lives in the URL so Back from a capsule returns to it. If its last capsule
  // just went out, fall back to All rather than showing an empty tab.
  const requested = parseSpiritFilter(searchParams.get("spirit"));
  const filter: SpiritFilter = tabs.includes(requested) ? requested : "all";
  const items = filterBySpirit(base, filter);
  const totals = shelfTotals(base);
  const low = isOwner ? lowItems(shelf) : [];

  const setFilter = (next: SpiritFilter) =>
    setSearchParams(next === "all" ? {} : { spirit: next }, {
      replace: true,
      preventScrollReset: true,
    });

  const onTaken = (item: ShelfItem) => (result: TakeCapsuleResultType) => {
    const state: CheersState = {
      activityId: result.activity_id,
      capsuleId: item.capsule.id,
      qty: result.qty,
      isLow: result.is_low,
    };
    navigate(ROUTES.CHEERS, { state });
  };

  return (
    <Screen gap={18} withNav>
      <header className={styles.header}>
        <AvatarMenu />
        <p className={styles.eyebrow}>Tonight's pour list</p>
        <h1 className={styles.title}>{settings?.owner_name}'s Cabinet</h1>
        <p className={styles.totals}>
          {plural(totals.capsules, "capsule")}, {plural(totals.cocktails, "cocktail")}
        </p>
      </header>

      {low.length > 0 && (
        <Link to={ROUTES.MANAGE} className={styles.lowBanner}>
          <span className={styles.lowText}>
            <span className={styles.lowCount}>{low.length} running low</span>
            <span className={styles.lowNames}>{lowNamesPreview(low)}</span>
          </span>
          <span className={styles.restock}>Restock →</span>
        </Link>
      )}

      <SpiritTabs tabs={tabs} value={filter} onChange={setFilter} />

      <div className={styles.toolbar}>
        <h2 className={styles.filterTitle}>{filterTitle(filter, isOwner)}</h2>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {items.length === 0 ? (
        <p className={ui.emptyState}>Nothing on the shelf here yet.</p>
      ) : view === "grid" ? (
        <div className={styles.grid}>
          {items.map((item) => (
            <GridCard key={item.capsule.id} item={item} />
          ))}
        </div>
      ) : (
        <div className={styles.list}>
          {items.map((item) => (
            <ListRow key={item.capsule.id} item={item} onTake={() => setTaking(item)} />
          ))}
        </div>
      )}

      {taking && (
        <TakeSheet item={taking} onClose={() => setTaking(null)} onTaken={onTaken(taking)} />
      )}
    </Screen>
  );
}

function GridCard({ item }: { item: ShelfItem }) {
  const { capsule, status } = item;
  return (
    <Link
      to={capsuleRoute(capsule.id)}
      className={cx(styles.card, status === "out" && styles.dimmed)}
    >
      <CapsuleTile
        src={sizedImage(capsule.img_box, IMAGE_WIDTH.tile)}
        alt={capsule.name}
        radius={20}
        inset={8}
      >
        <span
          className={cx(
            styles.qtyPill,
            status === "low" && styles.qtyPillLow,
            status === "out" && styles.qtyPillOut,
          )}
        >
          {qtyPillText(item)}
        </span>
      </CapsuleTile>
      <span className={styles.cardText}>
        <span className={styles.cardName}>{capsule.name}</span>
        <span className={cx(styles.cardCaption, status === "low" && styles.low)}>
          {gridCaption(item)}
        </span>
      </span>
    </Link>
  );
}

function ListRow({ item, onTake }: { item: ShelfItem; onTake: () => void }) {
  const { capsule, qty, status } = item;
  return (
    <div className={cx(styles.row, status === "out" && styles.dimmed)}>
      <Link to={capsuleRoute(capsule.id)} className={styles.rowLink}>
        <CapsuleTile
          src={sizedImage(capsule.img_box, IMAGE_WIDTH.thumb)}
          alt={capsule.name}
          size={64}
          radius={14}
          inset={4}
        />
        <span className={styles.rowText}>
          <span className={styles.rowName}>{capsule.name}</span>
          <span className={cx(styles.rowMeta, status === "low" && styles.low)}>
            {SPIRIT_LABELS[capsule.spirit]} · {statusShort(item)}
          </span>
        </span>
        <span className={styles.rowQty}>{qty}</span>
      </Link>
      <button
        type="button"
        className={styles.takeButton}
        onClick={onTake}
        disabled={status === "out"}
        aria-label={`Take one ${capsule.name}`}
      >
        Take
      </button>
    </div>
  );
}
