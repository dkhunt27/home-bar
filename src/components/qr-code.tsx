import { useMemo } from "react";
import { encode } from "uqr";
import styles from "./qr-code.module.css";

interface QrCodeProps {
  value: string;
  /** What a screen reader hears instead of the pattern. */
  label: string;
}

/** The quiet zone the spec asks for, so scanners can find the edges. */
const BORDER = 4;

/** Phosphor's "Martini", fill weight (MIT), on its 256-unit grid. */
const MARTINI =
  "M237.66,45.66A8,8,0,0,0,232,32H24a8,8,0,0,0-5.66,13.66L120,147.31V208H88a8,8,0,0,0,0,16h80a8,8,0,0,0,0-16H136V147.31Zm-25,2.34-16,16H59.31l-16-16Z";

/**
 * A QR code as one SVG path: a 1x1 square per dark module, scaled up by the viewBox. A
 * martini glass sits in a blank square in the middle.
 */
export function QrCode({ value, label }: QrCodeProps) {
  const { size, path, hole } = useMemo(() => {
    // H: the glass hides the modules under it, and H rebuilds up to 30% of the code (M's 15%
    // would leave little for a smudged or glare-y printout on top of that).
    const qr = encode(value, { ecc: "H", border: BORDER });
    // A quarter of the symbol across, so ~7% of the modules: well inside what H recovers.
    // Odd, like every QR size, so it centers on the grid.
    const side = Math.round(((qr.size - 2 * BORDER) * 0.25 - 1) / 2) * 2 + 1;
    const start = (qr.size - side) / 2;
    const inHole = (n: number) => n >= start && n < start + side;
    let d = "";
    for (const [y, row] of qr.data.entries()) {
      for (const [x, dark] of row.entries()) {
        if (dark && !(inHole(x) && inHole(y))) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: qr.size, path: d, hole: { start, side } };
  }, [value]);

  return (
    <svg
      className={styles.code}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={label}
    >
      <path d={path} />
      {/* Inset a module so the glass doesn't touch the modules around it. */}
      <path
        d={MARTINI}
        transform={`translate(${hole.start + 1} ${hole.start + 1}) scale(${(hole.side - 2) / 256})`}
        shapeRendering="geometricPrecision"
      />
    </svg>
  );
}
