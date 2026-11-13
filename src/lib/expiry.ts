// Pure best-by rules for the owner's Expiring screen and its card on Manage: which group a
// box falls in, the order, and the copy. A best-by is a calendar date ("2027-01-15", no time
// or zone), so every comparison is in whole local days. `now` is a parameter everywhere so
// the tests can pin the clock.

import type { BoxDbType, CapsuleDbType, CollectionDbType } from "../types";
import { plural } from "./bar";

/** "Soon" on the Expiring screen and the Manage card. */
export const EXPIRING_SOON_DAYS = 30;

export type ExpiryGroup = "past" | "soon" | "later" | "none";

const GROUP_ORDER: ExpiryGroup[] = ["past", "soon", "later", "none"];

export const EXPIRY_GROUP_LABELS: Record<ExpiryGroup, string> = {
  past: "Past best-by",
  soon: `Next ${EXPIRING_SOON_DAYS} days`,
  later: "Later",
  none: "No date",
};

function parseDate(isoDate: string): [year: number, month: number, day: number] {
  const [year, month, day] = isoDate.split("-").map(Number);
  return [year, month, day];
}

/** Whole days from today to the date: 0 today, 1 tomorrow, -1 yesterday. */
export function daysUntil(isoDate: string, now: Date): number {
  const [y, m, d] = parseDate(isoDate);
  const day = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((day - today) / 86_400_000);
}

export function expiryGroup(days: number | null): ExpiryGroup {
  if (days === null) return "none";
  if (days < 0) return "past";
  if (days <= EXPIRING_SOON_DAYS) return "soon";
  return "later";
}

/** "Dec 3", or "Dec 3, 2027" when it isn't this year. */
export function formatBestBy(isoDate: string, now: Date): string {
  const [y, m, d] = parseDate(isoDate);
  return new Date(y, m - 1, d).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: y === now.getFullYear() ? undefined : "numeric",
  });
}

/** "Today", "Tomorrow", "In 9 days", "In 5 months", "Yesterday", "4 days ago". */
export function relativeDays(days: number): string {
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days < 0) return `${plural(-days, "day")} ago`;
  if (days <= 60) return `In ${days} days`;
  return `In ${Math.round(days / 30.4)} months`;
}

export interface ExpiringRow {
  box: BoxDbType;
  capsule: CapsuleDbType;
  /** The pack it came in, if any. */
  collection: CollectionDbType | undefined;
  /** Null when the box has no date. */
  days: number | null;
}

/** The Expiring screen: boxes with some left, soonest best-by first, in groups (past, next 30
 * days, later, no date), each group only if it has a box. Ties and undated boxes go A–Z. */
export function expiringGroups(
  boxes: BoxDbType[],
  capsules: CapsuleDbType[],
  collections: CollectionDbType[],
  now: Date,
): { group: ExpiryGroup; rows: ExpiringRow[] }[] {
  const capsulesById = new Map(capsules.map((c) => [c.id, c]));
  const collectionsById = new Map(collections.map((c) => [c.id, c]));
  const rows: ExpiringRow[] = [];
  for (const box of boxes) {
    const capsule = capsulesById.get(box.capsule_id);
    if (!capsule || box.qty <= 0) continue;
    rows.push({
      box,
      capsule,
      collection: box.collection_id ? collectionsById.get(box.collection_id) : undefined,
      days: box.expires_on ? daysUntil(box.expires_on, now) : null,
    });
  }
  rows.sort(
    (a, b) =>
      (a.days ?? Number.POSITIVE_INFINITY) - (b.days ?? Number.POSITIVE_INFINITY) ||
      a.capsule.name.localeCompare(b.capsule.name),
  );
  return GROUP_ORDER.map((group) => ({
    group,
    rows: rows.filter((r) => expiryGroup(r.days) === group),
  })).filter((g) => g.rows.length > 0);
}

/** The Manage card's line: "3 capsules past best-by · 6 in the next 30 days", or the next
 * date when nothing's close, or a nudge when there are no dates at all. */
export function expirySummary(boxes: BoxDbType[], now: Date): string {
  let past = 0;
  let soon = 0;
  let next: string | null = null;
  for (const box of boxes) {
    if (!box.expires_on || box.qty <= 0) continue;
    const group = expiryGroup(daysUntil(box.expires_on, now));
    if (group === "past") past += box.qty;
    if (group === "soon") soon += box.qty;
    if (!next || box.expires_on < next) next = box.expires_on;
  }
  if (past > 0 || soon > 0) {
    const parts = [];
    if (past > 0) parts.push(`${plural(past, "capsule")} past best-by`);
    if (soon > 0) {
      const what = past > 0 ? soon : plural(soon, "capsule");
      parts.push(`${what} in the next ${EXPIRING_SOON_DAYS} days`);
    }
    return parts.join(" · ");
  }
  if (next) return `Nothing close. Next best-by ${formatBestBy(next, now)}`;
  return "Add best-by dates when you restock";
}

/** Whether the Manage card should read as a warning: something's already past. */
export function hasPastBestBy(boxes: BoxDbType[], now: Date): boolean {
  return boxes.some((b) => b.qty > 0 && b.expires_on && daysUntil(b.expires_on, now) < 0);
}
