import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AddBoxSheet } from "../components/add-box-sheet";
import { BackButton } from "../components/back-button";
import { CapsuleTile } from "../components/capsule-tile";
import { LoadError } from "../components/load-error";
import { Loading } from "../components/loading";
import { Segmented } from "../components/segmented";
import { Stepper } from "../components/stepper";
import { TakeSheet } from "../components/take-sheet";
import ui from "../components/ui.module.css";
import { useAuth } from "../hooks/use-auth";
import { useShelfItem } from "../hooks/use-bar-data";
import { useAdjustStock } from "../hooks/use-bar-mutations";
import { BOX_SIZE, SPIRIT_LABELS, statusLong } from "../lib/bar";
import { cx } from "../lib/cx";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import { type CheersState, collectionsForRoute, ROUTES } from "../routes";
import type { TakeCapsuleResultType } from "../types";
import styles from "./capsule-page.module.css";

type Photo = "box" | "pour";

export default function CapsulePage() {
  const { capsuleId } = useParams();
  const { isOwner } = useAuth();
  const { found, settings, isPending, error } = useShelfItem(capsuleId);
  // The pour shows the drink itself; the box is a tap away.
  const [photo, setPhoto] = useState<Photo>("pour");
  const [taking, setTaking] = useState(false);
  const [adding, setAdding] = useState(false);
  const adjust = useAdjustStock();
  const navigate = useNavigate();

  if (error) return <LoadError error={error} />;
  if (isPending) return <Loading />;
  if (!found) return <Navigate to={ROUTES.BAR} replace />;

  const { item, inBar } = found;
  const { capsule, qty, status } = item;
  const out = status === "out";

  const onTaken = (result: TakeCapsuleResultType) => {
    const state: CheersState = {
      activityId: result.activity_id,
      capsuleId: capsule.id,
      qty: result.qty,
      isLow: result.is_low,
    };
    navigate(ROUTES.CHEERS, { state, replace: true });
  };

  return (
    <>
      <main className={styles.page}>
        <div className={styles.topBar}>
          <BackButton fallback={ROUTES.BAR} />
          <Segmented
            variant="pill"
            label="Photo"
            value={photo}
            onChange={setPhoto}
            options={[
              { value: "box", label: "Box" },
              { value: "pour", label: "Pour" },
            ]}
          />
        </div>

        <CapsuleTile
          src={sizedImage(photo === "box" ? capsule.img_box : capsule.img_pour, IMAGE_WIDTH.hero)}
          alt={`${capsule.name}, ${photo === "box" ? "box and capsule" : "poured"}`}
          radius={28}
          inset={14}
          eager
          className={styles.hero}
        />

        <div className={styles.content}>
          <p className={ui.eyebrow}>{SPIRIT_LABELS[capsule.spirit]}</p>
          <h1 className={styles.name}>{capsule.name}</h1>
          <p className={cx(styles.status, status === "low" && styles.low)}>{statusLong(item)}</p>
          {capsule.description && <p className={styles.description}>{capsule.description}</p>}

          {isOwner && (
            <div className={styles.shelfCard}>
              <span className={styles.shelfLabel}>Shelf count</span>
              <Stepper
                size={40}
                label={capsule.name}
                onDecrement={() => adjust.mutate({ capsuleId: capsule.id, delta: -1 })}
                onIncrement={() => adjust.mutate({ capsuleId: capsule.id, delta: 1 })}
                decrementDisabled={!inBar || qty === 0}
                incrementDisabled={!inBar}
              >
                <span className={styles.shelfQty}>{qty}</span>
              </Stepper>
              {capsule.sold_single ? (
                <button type="button" className={styles.boxButton} onClick={() => setAdding(true)}>
                  +{BOX_SIZE} box
                </button>
              ) : (
                // No box of 8 of this one: it comes in a collection.
                <Link to={collectionsForRoute(capsule.name)} className={styles.boxButton}>
                  Collections
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className={styles.footer}>
        {out ? (
          <div className={styles.outBlock}>
            {isOwner
              ? "Out of stock"
              : `Out of stock · ask ${settings?.owner_name ?? "the host"} to restock`}
          </div>
        ) : (
          <button type="button" className={ui.primaryButtonLarge} onClick={() => setTaking(true)}>
            Take one
          </button>
        )}
      </footer>

      {taking && <TakeSheet item={item} onClose={() => setTaking(false)} onTaken={onTaken} />}
      {adding && (
        <AddBoxSheet target={{ kind: "capsule", capsule, qty }} onClose={() => setAdding(false)} />
      )}
    </>
  );
}
