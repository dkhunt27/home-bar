import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AddBoxSheet, type AddBoxTarget } from "../components/add-box-sheet";
import { BackButton } from "../components/back-button";
import { CapsuleTile } from "../components/capsule-tile";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Screen } from "../components/screen";
import { Segmented } from "../components/segmented";
import { SpiritTabs } from "../components/spirit-tabs";
import ui from "../components/ui.module.css";
import { useCapsules, useCollections, useStock } from "../hooks/use-bar-data";
import {
  BOX_SIZE,
  catalogRows,
  catalogTabs,
  collectionContents,
  collectionRows,
  SPIRIT_LABELS,
  type SpiritFilter,
} from "../lib/bar";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { ROUTES } from "../routes";
import styles from "./add-capsule-page.module.css";

type View = "singles" | "collections";

export default function AddCapsulePage() {
  const capsules = useCapsules();
  const collections = useCollections();
  const stock = useStock();
  // A collection-only cocktail's "+ box" lands here searched for it (collectionsForRoute).
  const [params] = useSearchParams();
  const [view, setView] = useState<View>(
    params.get("view") === "collections" ? "collections" : "singles",
  );
  const [query, setQuery] = useState(() => params.get("q") ?? "");
  const [filter, setFilter] = useState<SpiritFilter>("all");
  const [adding, setAdding] = useState<AddBoxTarget | null>(null);

  const error = capsules.error ?? collections.error ?? stock.error;
  if (error) return <LoadError error={error} />;
  if (!capsules.data || !collections.data || !stock.data) return <Loading />;

  const onShelf = new Map(stock.data.map((s) => [s.capsule_id, s.qty]));
  const singles = view === "singles" ? catalogRows(capsules.data, filter, query) : [];
  const packs =
    view === "collections" ? collectionRows(collections.data, capsules.data, filter, query) : [];
  const empty = view === "singles" ? singles.length === 0 : packs.length === 0;
  const spirit = filter === "all" ? "" : `${SPIRIT_LABELS[filter]} `;

  return (
    <Screen gap={16}>
      <header className={styles.header}>
        <BackButton fallback={ROUTES.MANAGE} />
        <h1 className={styles.title}>Add a capsule</h1>
      </header>

      <Segmented
        variant="block"
        label="Box type"
        value={view}
        onChange={setView}
        options={[
          { value: "singles", label: "Singles" },
          { value: "collections", label: "Collections" },
        ]}
      />

      <input
        className={ui.input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search the Bartesian catalog"
        aria-label="Search the Bartesian catalog"
        type="search"
        enterKeyHint="search"
      />

      <SpiritTabs tabs={catalogTabs(capsules.data)} value={filter} onChange={setFilter} />

      <div className={styles.list}>
        {empty && (
          <p className={ui.emptyState}>
            {view === "singles"
              ? `No ${spirit}capsules match "${query}".`
              : `No ${spirit}collections match "${query}".`}
          </p>
        )}

        {singles.map((capsule) => {
          const have = onShelf.get(capsule.id);
          const inBar = have !== undefined;
          return (
            <div key={capsule.id} className={ui.listRow}>
              <CapsuleTile
                src={sizedImage(capsule.img_box, IMAGE_WIDTH.thumb)}
                alt={capsule.name}
                size={52}
                radius={12}
                inset={3}
              />
              <div className={ui.rowText}>
                <span className={ui.rowName}>{capsule.name}</span>
                <span className={ui.rowMeta}>
                  {SPIRIT_LABELS[capsule.spirit]} · {inBar ? `${have} on shelf` : "Not in bar"}
                </span>
              </div>
              <button
                type="button"
                className={inBar ? ui.pillOutline : ui.pillFilled}
                onClick={() => setAdding({ kind: "capsule", capsule, qty: have ?? 0 })}
                aria-label={`Add a box of ${capsule.name}`}
              >
                +{BOX_SIZE} box
              </button>
            </div>
          );
        })}

        {packs.map((pack) => {
          const { collection, items, size } = pack;
          const inBar = items.some((i) => onShelf.has(i.capsule.id));
          return (
            <div key={collection.id} className={ui.listRow}>
              <CapsuleTile
                src={sizedImage(collection.img, IMAGE_WIDTH.thumb)}
                alt={collection.name}
                size={52}
                radius={12}
                inset={3}
              />
              <div className={ui.rowText}>
                <span className={ui.rowName}>{collection.name}</span>
                <span className={styles.contents}>{collectionContents(items)}</span>
              </div>
              <button
                type="button"
                className={inBar ? ui.pillOutline : ui.pillFilled}
                onClick={() => setAdding({ kind: "collection", view: pack })}
                aria-label={`Add a ${collection.name} box`}
              >
                +{size} box
              </button>
            </div>
          );
        })}
      </div>

      {adding && <AddBoxSheet target={adding} onClose={() => setAdding(null)} />}
    </Screen>
  );
}
