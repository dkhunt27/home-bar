import { useMemo } from "react";
import { encode } from "uqr";
import styles from "./qr-code.module.css";

interface QrCodeProps {
  value: string;
  /** What a screen reader hears instead of the pattern. */
  label: string;
}

/** A QR code as one SVG path: a 1x1 square per dark module, scaled up by the viewBox. */
export function QrCode({ value, label }: QrCodeProps) {
  const { size, path } = useMemo(() => {
    // M: survives a smudged or glare-y printout better than the default L. The 4-module
    // border is the quiet zone the spec asks for, so scanners can find the edges.
    const qr = encode(value, { ecc: "M", border: 4 });
    let d = "";
    for (const [y, row] of qr.data.entries()) {
      for (const [x, dark] of row.entries()) {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      }
    }
    return { size: qr.size, path: d };
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
    </svg>
  );
}
