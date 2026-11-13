import { useState } from "react";
import { BackButton } from "../components/back-button";
import { CapsuleTile } from "../components/capsule-tile";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Screen } from "../components/screen";
import { SpiritTabs } from "../components/spirit-tabs";
import ui from "../components/ui.module.css";
import { useCapsules, useStock } from "../hooks/use-bar-data";
import { useAddBox } from "../hooks/use-bar-mutations";
import { BOX_SIZE, catalogRows, catalogTabs, SPIRIT_LABELS, type SpiritFilter } from "../lib/bar";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { ROUTES } from "../routes";
import styles from "./add-capsule-page.module.css";

export default function AddCapsulePage() {
  const capsules = useCapsules();
  const stock = useStock();
  const addBox = useAddBox();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SpiritFilter>("all");

  const error = capsules.error ?? stock.error;
  if (error) return <LoadError error={error} />;
  if (!capsules.data || !stock.data) return <Loading />;

  const onShelf = new Map(stock.data.map((s) => [s.capsule_id, s.qty]));
  const rows = catalogRows(capsules.data, filter, query);

  return (
    <Screen gap={16}>
      <header className={styles.header}>
        <BackButton fallback={ROUTES.MANAGE} />
        <h1 className={styles.title}>Add a capsule</h1>
      </header>

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
        {rows.length === 0 && (
          <p className={ui.emptyState}>
            No {filter === "all" ? "" : `${SPIRIT_LABELS[filter]} `}capsules match "{query}".
          </p>
        )}
        {rows.map((capsule) => {
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
                onClick={() => addBox.mutate(capsule.id)}
                aria-label={`Add a box of ${capsule.name}`}
              >
                +{BOX_SIZE} box
              </button>
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
