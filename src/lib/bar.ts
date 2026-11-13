// Pure shelf logic: what's in stock, what's low, what each screen shows. No Supabase, no
// React, so every rule the design spells out (sort order, who sees empty capsules, which
// spirit tabs appear) is unit-tested in bar.test.ts.

import { ROUTES } from "../routes";
import type { CapsuleDbType, SettingsDbType, SpiritType, StockDbType } from "../types";

/** One Bartesian box. */
export const BOX_SIZE = 8;

/** Manage's low-stock stepper range. Mirrors the CHECK on settings.low_threshold. */
export const LOW_THRESHOLD_MIN = 1;
export const LOW_THRESHOLD_MAX = 8;

export const SPIRIT_LABELS: Record<SpiritType, string> = {
  vodka: "Vodka",
  tequila: "Tequila",
  whiskey: "Whiskey",
  rum: "Rum",
  gin: "Gin",
  multi: "Mixed",
};

export type SpiritFilter = "all" | SpiritType;

/** Tab order on the Bar screen. */
export const SPIRIT_FILTERS: SpiritFilter[] = [
  "all",
  "vodka",
  "tequila",
  "whiskey",
  "rum",
  "gin",
  "multi",
];

export type StockStatus = "in" | "low" | "out";

export interface ShelfItem {
  capsule: CapsuleDbType;
  qty: number;
  status: StockStatus;
}

export function stockStatus(qty: number, threshold: number): StockStatus {
  if (qty <= 0) return "out";
  if (qty <= threshold) return "low";
  return "in";
}

export function isLowOrOut(item: ShelfItem): boolean {
  return item.status !== "in";
}

/** Everything the owner has a stock row for: in-stock first, then alphabetical. */
export function buildShelf(
  capsules: CapsuleDbType[],
  stock: StockDbType[],
  threshold: number,
): ShelfItem[] {
  const byId = new Map(capsules.map((c) => [c.id, c]));
  const items: ShelfItem[] = [];
  for (const row of stock) {
    const capsule = byId.get(row.capsule_id);
    if (!capsule) continue;
    items.push({ capsule, qty: row.qty, status: stockStatus(row.qty, threshold) });
  }
  return items.sort(
    (a, b) =>
      Number(a.status === "out") - Number(b.status === "out") ||
      a.capsule.name.localeCompare(b.capsule.name),
  );
}

/** What the Bar screen lists: guests don't see empty capsules (unless the owner turned
 * `show_out_to_guests` on); the owner sees the whole shelf, empties dimmed at the end. */
export function visibleShelf(
  shelf: ShelfItem[],
  isOwner: boolean,
  settings: Pick<SettingsDbType, "show_out_to_guests"> | undefined,
): ShelfItem[] {
  if (isOwner || settings?.show_out_to_guests) return shelf;
  return shelf.filter((i) => i.status !== "out");
}

/** "All" always; a spirit tab only when there's something of that spirit in view. */
export function spiritTabs(items: ShelfItem[]): SpiritFilter[] {
  const present = new Set(items.map((i) => i.capsule.spirit));
  return SPIRIT_FILTERS.filter((f) => f === "all" || present.has(f));
}

export function filterBySpirit(items: ShelfItem[], filter: SpiritFilter): ShelfItem[] {
  return filter === "all" ? items : items.filter((i) => i.capsule.spirit === filter);
}

export function parseSpiritFilter(value: string | null): SpiritFilter {
  return SPIRIT_FILTERS.includes(value as SpiritFilter) ? (value as SpiritFilter) : "all";
}

export function filterTitle(filter: SpiritFilter, isOwner: boolean): string {
  if (filter === "all") return isOwner ? "Whole shelf" : "Everything in stock";
  return `${SPIRIT_LABELS[filter]} cocktails`;
}

/** Header line: "51 capsules, 15 cocktails". Cocktails counts kinds actually pourable. */
export function shelfTotals(items: ShelfItem[]): { capsules: number; cocktails: number } {
  return {
    capsules: items.reduce((sum, i) => sum + i.qty, 0),
    cocktails: items.filter((i) => i.status !== "out").length,
  };
}

/** Low and out capsules, emptiest first. Drives the owner's banner and Manage's list. */
export function lowItems(shelf: ShelfItem[]): ShelfItem[] {
  return shelf
    .filter(isLowOrOut)
    .sort((a, b) => a.qty - b.qty || a.capsule.name.localeCompare(b.capsule.name));
}

/** "Pineapple Margarita, Rum Breeze, Bee's Knees…" — the first three names. */
export function lowNamesPreview(items: ShelfItem[], max = 3): string {
  const names = items
    .slice(0, max)
    .map((i) => i.capsule.name)
    .join(", ");
  return items.length > max ? `${names}…` : names;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

// ── Per-item copy ──────────────────────────────────────────────────────────────────────

/** Grid caption under the name: "Gin", "Gin · low", or "Out". */
export function gridCaption(item: ShelfItem): string {
  const spirit = SPIRIT_LABELS[item.capsule.spirit];
  if (item.status === "out") return "Out";
  if (item.status === "low") return `${spirit} · low`;
  return spirit;
}

/** Grid quantity pill: "×6" or "Out". */
export function qtyPillText(item: ShelfItem): string {
  return item.status === "out" ? "Out" : `×${item.qty}`;
}

/** Short status for list rows: "4 left", "Only 1 left", "Out". */
export function statusShort(item: ShelfItem): string {
  if (item.status === "out") return "Out";
  if (item.status === "low") return `Only ${item.qty} left`;
  return `${item.qty} left`;
}

/** Detail screen status line. */
export function statusLong(item: ShelfItem): string {
  if (item.status === "out") return "Out of stock";
  if (item.status === "low") return `Running low · ${item.qty} left`;
  return `${item.qty} in the bar`;
}

/** The guest link's key rides in the URL fragment (`/sign-in#k=...`). Browsers never send a
 * fragment to the server, so the key stays out of request logs. */
const JOIN_KEY_PARAM = "k";

/** The link behind the Guest link screen's QR code. */
export function guestLink(origin: string, key: string): string {
  return `${origin}${ROUTES.SIGN_IN}#${new URLSearchParams({ [JOIN_KEY_PARAM]: key })}`;
}

/** The key from a guest link's fragment (`location.hash`), or null on a plain visit. */
export function joinKeyFromHash(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, "")).get(JOIN_KEY_PARAM)?.trim() || null;
}
