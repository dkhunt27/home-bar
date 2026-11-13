import type { ReactNode } from "react";
import { cx } from "../lib/cx";
import styles from "./capsule-tile.module.css";

interface CapsuleTileProps {
  src: string;
  alt?: string;
  /** Fixed square size in px. Omit to fill the parent's width (grid cards, detail hero). */
  size?: number;
  radius: number;
  /** Padding around the photo inside the tile. */
  inset: number;
  /** Above-the-fold images (detail hero, sheet) skip lazy loading. */
  eager?: boolean;
  className?: string;
  /** Overlays, e.g. the grid's quantity pill. */
  children?: ReactNode;
}

/**
 * A capsule photo on the warm tile color. Bartesian shoots on white, so the photo is
 * multiplied onto the tile and the white drops out to cream; that's the whole look.
 */
export function CapsuleTile({
  src,
  alt = "",
  size,
  radius,
  inset,
  eager,
  className,
  children,
}: CapsuleTileProps) {
  return (
    <div
      className={cx(styles.tile, className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{ padding: inset }}
      />
      {children}
    </div>
  );
}
