import { useState } from "react";
import { useAddBox, useAddCollectionBox } from "../hooks/use-bar-mutations";
import { BOX_SIZE, type CollectionView, collectionContents } from "../lib/bar";
import { IMAGE_WIDTH, sizedImage } from "../lib/images";
import type { CapsuleDbType } from "../types";
import { BestByField } from "./best-by-field";
import { BottomSheet } from "./bottom-sheet";
import styles from "./bottom-sheet.module.css";
import { CapsuleTile } from "./capsule-tile";

/** What a "+8 box" button adds: a box of one capsule (`qty` is what's on the shelf now), or
 * a variety pack. */
export type AddBoxTarget =
  | { kind: "capsule"; capsule: CapsuleDbType; qty: number }
  | { kind: "collection"; view: CollectionView };

interface AddBoxSheetProps {
  target: AddBoxTarget;
  onClose: () => void;
}

/** "Add a box of Margarita?" with its best-by date, from every "+8 box" (Manage, Add a
 * capsule, the Detail shelf card). Optimistic like the old one-tap button: the sheet closes
 * on Add and the counts move straight away. */
export function AddBoxSheet({ target, onClose }: AddBoxSheetProps) {
  const addBox = useAddBox();
  const addCollectionBox = useAddCollectionBox();
  const [expiresOn, setExpiresOn] = useState("");

  const confirm = () => {
    const date = expiresOn || null;
    if (target.kind === "capsule") {
      addBox.mutate({ capsuleId: target.capsule.id, expiresOn: date });
    } else {
      addCollectionBox.mutate({ collection: target.view.collection, expiresOn: date });
    }
    onClose();
  };

  const img = target.kind === "capsule" ? target.capsule.img_box : target.view.collection.img;
  const title =
    target.kind === "capsule"
      ? `Add a box of ${target.capsule.name}?`
      : `Add a ${target.view.collection.name} box?`;
  const sub =
    target.kind === "capsule"
      ? `+${BOX_SIZE} · makes ${target.qty + BOX_SIZE} on the shelf`
      : collectionContents(target.view.items);

  return (
    <BottomSheet labelledBy="add-box-sheet-title" onClose={onClose}>
      <div className={styles.summary}>
        <CapsuleTile
          src={sizedImage(img, IMAGE_WIDTH.sheet)}
          size={84}
          radius={18}
          inset={4}
          eager
        />
        <div className={styles.text}>
          <h2 id="add-box-sheet-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.sub}>{sub}</p>
        </div>
      </div>
      <BestByField value={expiresOn} onChange={setExpiresOn} />
      <div className={styles.buttons}>
        <button type="button" className={styles.cancel} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={styles.confirm} onClick={confirm}>
          Add box
        </button>
      </div>
    </BottomSheet>
  );
}
