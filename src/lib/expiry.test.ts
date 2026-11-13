// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { BoxDbType, CapsuleDbType, CollectionDbType } from "../types";
import {
  daysUntil,
  EXPIRING_SOON_DAYS,
  expiringGroups,
  expiryGroup,
  expirySummary,
  formatBestBy,
  hasPastBestBy,
  relativeDays,
} from "./expiry";

const NOW = new Date(2026, 10, 13, 21, 30); // Fri Nov 13 2026, 9:30 PM

function capsule(id: string, name: string): CapsuleDbType {
  return {
    id,
    name,
    spirit: "vodka",
    img_box: `https://cdn.example/${id}-box.png?v=1`,
    img_pour: `https://cdn.example/${id}-pour.png?v=1`,
    description: null,
    sort_order: 0,
    sold_single: true,
    created_at: null,
    updated_at: null,
  };
}

let nextId = 0;
function box(
  capsule_id: string,
  expires_on: string | null,
  qty: number,
  collection_id: string | null = null,
): BoxDbType {
  nextId += 1;
  return {
    id: `box-${nextId}`,
    capsule_id,
    collection_id,
    expires_on,
    size: 8,
    qty,
    created_at: "2026-11-01T12:00:00Z",
  };
}

const CAPSULES = [
  capsule("margarita", "Margarita"),
  capsule("manhattan", "Manhattan"),
  capsule("aviation", "Aviation"),
  capsule("frosty-navel", "Frosty Navel"),
];

const FESTIVE: CollectionDbType = {
  id: "festive",
  name: "Festive Collection",
  img: "https://cdn.example/festive.png?v=1",
  sort_order: 0,
  created_at: null,
  updated_at: null,
  collection_items: [{ capsule_id: "frosty-navel", qty: 2 }],
};

describe("daysUntil", () => {
  it("counts whole local days, whatever the time of day", () => {
    expect(daysUntil("2026-11-13", NOW)).toBe(0);
    expect(daysUntil("2026-11-14", NOW)).toBe(1);
    expect(daysUntil("2026-11-12", NOW)).toBe(-1);
    expect(daysUntil("2026-11-13", new Date(2026, 10, 13, 0, 1))).toBe(0);
  });

  it("crosses months, years and the DST change", () => {
    expect(daysUntil("2026-12-13", NOW)).toBe(30);
    expect(daysUntil("2027-01-01", NOW)).toBe(49);
    // US clocks fall back on Nov 1 2026; a day is still a day.
    expect(daysUntil("2026-10-31", NOW)).toBe(-13);
  });
});

describe("expiryGroup", () => {
  it("is past before today, soon through the next 30 days, later after", () => {
    expect(expiryGroup(null)).toBe("none");
    expect(expiryGroup(-1)).toBe("past");
    expect(expiryGroup(0)).toBe("soon");
    expect(expiryGroup(EXPIRING_SOON_DAYS)).toBe("soon");
    expect(expiryGroup(EXPIRING_SOON_DAYS + 1)).toBe("later");
  });
});

describe("copy", () => {
  it("leaves the year off this year's dates only", () => {
    const thisYear = formatBestBy("2026-12-03", NOW);
    const nextYear = formatBestBy("2027-12-03", NOW);
    expect(thisYear).not.toMatch(/2026/);
    expect(nextYear).toMatch(/2027/);
    expect(nextYear.startsWith(thisYear)).toBe(true);
  });

  it("says how far away a date is", () => {
    expect(relativeDays(0)).toBe("Today");
    expect(relativeDays(1)).toBe("Tomorrow");
    expect(relativeDays(-1)).toBe("Yesterday");
    expect(relativeDays(-4)).toBe("4 days ago");
    expect(relativeDays(9)).toBe("In 9 days");
    expect(relativeDays(60)).toBe("In 60 days");
    expect(relativeDays(150)).toBe("In 5 months");
  });
});

describe("expiringGroups", () => {
  const boxes = [
    box("aviation", null, 3),
    box("margarita", "2027-04-01", 4),
    box("manhattan", "2026-11-09", 1),
    box("frosty-navel", "2026-11-20", 2, "festive"),
    box("aviation", "2026-11-20", 8),
    box("margarita", "2026-12-01", 0), // poured empty: not shown
    box("gone-from-catalog", "2026-11-15", 2),
  ];

  const view = expiringGroups(boxes, CAPSULES, [FESTIVE], NOW);

  it("groups soonest first and skips empty groups", () => {
    expect(view.map((g) => g.group)).toEqual(["past", "soon", "later", "none"]);
  });

  it("sorts by date, then name, and leaves out empty boxes and unknown capsules", () => {
    const rows = view.flatMap((g) => g.rows);
    expect(rows.map((r) => [r.capsule.name, r.box.expires_on, r.days])).toEqual([
      ["Manhattan", "2026-11-09", -4],
      ["Aviation", "2026-11-20", 7],
      ["Frosty Navel", "2026-11-20", 7],
      ["Margarita", "2027-04-01", 139],
      ["Aviation", null, null],
    ]);
  });

  it("names the pack a box came in", () => {
    const frosty = view.flatMap((g) => g.rows).find((r) => r.capsule.id === "frosty-navel");
    expect(frosty?.collection?.name).toBe("Festive Collection");
  });
});

describe("expirySummary", () => {
  it("counts capsules past best-by and coming up", () => {
    expect(
      expirySummary(
        [box("a", "2026-11-01", 2), box("b", "2026-11-12", 1), box("c", "2026-11-30", 6)],
        NOW,
      ),
    ).toBe("3 capsules past best-by · 6 in the next 30 days");
    expect(expirySummary([box("c", "2026-11-30", 1)], NOW)).toBe("1 capsule in the next 30 days");
    expect(expirySummary([box("a", "2026-11-01", 1)], NOW)).toBe("1 capsule past best-by");
  });

  it("gives the next date when nothing's close", () => {
    const summary = expirySummary(
      [box("a", "2027-06-01", 8), box("b", "2027-03-01", 8), box("c", null, 4)],
      NOW,
    );
    expect(summary).toBe(`Nothing close. Next best-by ${formatBestBy("2027-03-01", NOW)}`);
  });

  it("nudges when nothing has a date, and ignores empty boxes", () => {
    expect(expirySummary([box("a", null, 4), box("b", "2026-11-01", 0)], NOW)).toBe(
      "Add best-by dates when you restock",
    );
  });

  it("warns only when something is past", () => {
    expect(hasPastBestBy([box("a", "2026-11-12", 1)], NOW)).toBe(true);
    expect(hasPastBestBy([box("a", "2026-11-12", 0), box("b", "2026-11-13", 1)], NOW)).toBe(false);
  });
});
