// Pure formatting for the Activity screen (grouping, relative times, the sentence on each
// row). `now` is a parameter everywhere so the tests can pin the clock.

import type { ActivityDbType, ActivityKindType } from "../types";

export type DayGroup = "Today" | "Yesterday" | "Earlier";

const DAY_GROUPS: DayGroup[] = ["Today", "Yesterday", "Earlier"];

function startOfDay(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  return s;
}

export function dayGroup(at: Date, now: Date): DayGroup {
  const today = startOfDay(now);
  if (at >= today) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (at >= yesterday) return "Yesterday";
  return "Earlier";
}

/** Under an hour: "38m ago". Today or yesterday: "9:42 PM". Older: "Tue · 9:42 PM". */
export function formatActivityTime(at: Date, now: Date): string {
  const diffMs = now.getTime() - at.getTime();
  if (diffMs < 60 * 60 * 1000) return `${Math.max(1, Math.round(diffMs / 60_000))}m ago`;
  const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (dayGroup(at, now) !== "Earlier") return time;
  return `${at.toLocaleDateString([], { weekday: "short" })} · ${time}`;
}

export function groupActivity<T extends Pick<ActivityDbType, "created_at">>(
  rows: T[],
  now: Date,
): { label: DayGroup; rows: T[] }[] {
  const groups = new Map<DayGroup, T[]>();
  for (const row of rows) {
    const label = dayGroup(new Date(row.created_at), now);
    const list = groups.get(label) ?? [];
    list.push(row);
    groups.set(label, list);
  }
  return DAY_GROUPS.filter((g) => groups.has(g)).map((label) => ({
    label,
    rows: groups.get(label) ?? [],
  }));
}

/** The words after the actor's name: "took a Margarita", "took an Old Fashioned",
 * "restocked Lemon Drop", "added Caramel Appletini". */
export function activityPhrase(kind: ActivityKindType, capsuleName: string): string {
  if (kind === "take") return `took ${/^[aeiou]/i.test(capsuleName) ? "an" : "a"} ${capsuleName}`;
  if (kind === "add") return `added ${capsuleName}`;
  return `restocked ${capsuleName}`;
}

/** "−1" for a pour (a real minus sign), "+8" for a box. */
export function activityAmount(kind: ActivityKindType, amount: number): string {
  return kind === "take" ? `−${amount}` : `+${amount}`;
}
