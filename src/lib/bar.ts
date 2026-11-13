// Pure shelf logic: what's in stock, what's low, what each screen shows. No Supabase, no
// React, so every rule the design spells out (sort order, who sees empty capsules, which
// spirit tabs appear) is unit-tested in bar.test.ts.

import { ROUTES } from "../routes";
import type {
  CapsuleDbType,
  CollectionDbType,
  SettingsDbType,
  SpiritType,
  StockDbType,
} from "../types";

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

function tabsFor(spirits: SpiritType[]): SpiritFilter[] {
  const present = new Set(spirits);
  return SPIRIT_FILTERS.filter((f) => f === "all" || present.has(f));
}

/** "All" always; a spirit tab only when there's something of that spirit in view. */
export function spiritTabs(items: ShelfItem[]): SpiritFilter[] {
  return tabsFor(items.map((i) => i.capsule.spirit));
}

/** The same tabs for Add a capsule, drawn from the whole catalog. */
export function catalogTabs(capsules: CapsuleDbType[]): SpiritFilter[] {
  return tabsFor(capsules.map((c) => c.spirit));
}

export function filterBySpirit(items: ShelfItem[], filter: SpiritFilter): ShelfItem[] {
  return filter === "all" ? items : items.filter((i) => i.capsule.spirit === filter);
}

/** The search box on Bar and Add a capsule: the name or the spirit contains the query. */
export function matchesSearch(capsule: CapsuleDbType, query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    !q ||
    capsule.name.toLowerCase().includes(q) ||
    SPIRIT_LABELS[capsule.spirit].toLowerCase().includes(q)
  );
}

export function searchShelf(items: ShelfItem[], query: string): ShelfItem[] {
  return query.trim() ? items.filter((i) => matchesSearch(i.capsule, query)) : items;
}

/** Add a capsule's list: the catalog A–Z, narrowed by the spirit tab and the search box.
 * Cocktails that only come in a collection are left out: there's no box of 8 to add. */
export function catalogRows(
  capsules: CapsuleDbType[],
  filter: SpiritFilter,
  query: string,
): CapsuleDbType[] {
  return capsules
    .filter(
      (c) => c.sold_single && (filter === "all" || c.spirit === filter) && matchesSearch(c, query),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Collections ────────────────────────────────────────────────────────────────────────

/** A variety pack with its cocktails looked up, A–Z. */
export interface CollectionView {
  collection: CollectionDbType;
  items: { capsule: CapsuleDbType; qty: number }[];
  /** Capsules in the box: 8 for every pack Bartesian sells today. */
  size: number;
}

export function collectionView(
  collection: CollectionDbType,
  capsulesById: Map<string, CapsuleDbType>,
): CollectionView {
  const items = collection.collection_items
    .flatMap(({ capsule_id, qty }) => {
      const capsule = capsulesById.get(capsule_id);
      return capsule ? [{ capsule, qty }] : [];
    })
    .sort((a, b) => a.capsule.name.localeCompare(b.capsule.name));
  return { collection, items, size: items.reduce((sum, i) => sum + i.qty, 0) };
}

/** Add a capsule's Collections list, A–Z. A pack shows under every spirit it has a cocktail
 * of, and the search box matches the pack's name or any cocktail in it ("frosty" finds both
 * packs with a Frosty Navel). */
export function collectionRows(
  collections: CollectionDbType[],
  capsules: CapsuleDbType[],
  filter: SpiritFilter,
  query: string,
): CollectionView[] {
  const byId = new Map(capsules.map((c) => [c.id, c]));
  const q = query.trim().toLowerCase();
  return collections
    .map((c) => collectionView(c, byId))
    .filter(
      ({ collection, items }) =>
        (filter === "all" || items.some((i) => i.capsule.spirit === filter)) &&
        (!q ||
          collection.name.toLowerCase().includes(q) ||
          items.some((i) => matchesSearch(i.capsule, q))),
    )
    .sort((a, b) => a.collection.name.localeCompare(b.collection.name));
}

/** "Berry & Bright, Frosty Navel and Peary Christmas". */
function listNames(names: string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** What's in the box: "2 each of Berry & Bright, Frosty Navel…", or "2 Margarita and 1
 * Mai Tai" for an uneven pack. */
export function collectionContents(items: CollectionView["items"]): string {
  const qtys = new Set(items.map((i) => i.qty));
  if (qtys.size === 1 && items.length > 1) {
    return `${items[0].qty} each of ${listNames(items.map((i) => i.capsule.name))}`;
  }
  return listNames(items.map((i) => `${i.qty} ${i.capsule.name}`));
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
