// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  activityAmount,
  activityPhrase,
  dayGroup,
  formatActivityTime,
  groupActivity,
} from "./activity-format";

// Local time, so day boundaries are the device's, as in the app.
const NOW = new Date(2026, 9, 29, 21, 0); // Thu Oct 29 2026, 9:00 PM
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("dayGroup", () => {
  it("splits on local midnight", () => {
    expect(dayGroup(new Date(2026, 9, 29, 0, 0), NOW)).toBe("Today");
    expect(dayGroup(new Date(2026, 9, 28, 23, 59), NOW)).toBe("Yesterday");
    expect(dayGroup(new Date(2026, 9, 28, 0, 0), NOW)).toBe("Yesterday");
    expect(dayGroup(new Date(2026, 9, 27, 23, 59), NOW)).toBe("Earlier");
  });
});

describe("formatActivityTime", () => {
  it("is relative under an hour, never 0m", () => {
    expect(formatActivityTime(minutesAgo(38), NOW)).toBe("38m ago");
    expect(formatActivityTime(minutesAgo(0), NOW)).toBe("1m ago");
  });

  it("is a clock time today and yesterday", () => {
    const time = formatActivityTime(minutesAgo(95), NOW);
    expect(time).not.toContain("ago");
    expect(time).not.toContain("·");
    expect(formatActivityTime(new Date(2026, 9, 28, 14, 42), NOW)).not.toContain("·");
  });

  it("adds the weekday when older", () => {
    expect(formatActivityTime(new Date(2026, 9, 26, 21, 42), NOW)).toMatch(/^\S+ · /);
  });
});

describe("groupActivity", () => {
  it("groups in Today / Yesterday / Earlier order, keeping row order, skipping empty groups", () => {
    const rows = [
      { id: "a", created_at: minutesAgo(10).toISOString() },
      { id: "b", created_at: new Date(2026, 9, 26).toISOString() },
      { id: "c", created_at: minutesAgo(60).toISOString() },
    ];
    expect(groupActivity(rows, NOW)).toEqual([
      { label: "Today", rows: [rows[0], rows[2]] },
      { label: "Earlier", rows: [rows[1]] },
    ]);
  });
});

describe("activityPhrase", () => {
  it("uses a/an for pours", () => {
    expect(activityPhrase("take", "Margarita")).toBe("took a Margarita");
    expect(activityPhrase("take", "Old Fashioned")).toBe("took an Old Fashioned");
    expect(activityPhrase("take", "Espresso Martini")).toBe("took an Espresso Martini");
  });

  it("describes boxes", () => {
    expect(activityPhrase("restock", "Lemon Drop")).toBe("restocked Lemon Drop");
    expect(activityPhrase("add", "Caramel Appletini")).toBe("added Caramel Appletini");
  });
});

describe("activityAmount", () => {
  it("signs the amount, with a real minus", () => {
    expect(activityAmount("take", 1)).toBe("−1");
    expect(activityAmount("restock", 8)).toBe("+8");
    expect(activityAmount("add", 8)).toBe("+8");
  });
});
