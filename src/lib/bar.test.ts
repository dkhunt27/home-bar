// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { CapsuleDbType, SpiritType, StockDbType } from "../types";
import {
  buildShelf,
  catalogRows,
  catalogTabs,
  filterBySpirit,
  filterTitle,
  gridCaption,
  guestLink,
  joinKeyFromHash,
  lowItems,
  lowNamesPreview,
  parseSpiritFilter,
  plural,
  qtyPillText,
  type ShelfItem,
  searchShelf,
  shelfTotals,
  spiritTabs,
  statusLong,
  statusShort,
  stockStatus,
  visibleShelf,
} from "./bar";

function capsule(id: string, name: string, spirit: SpiritType): CapsuleDbType {
  return {
    id,
    name,
    spirit,
    img_box: `https://cdn.example/${id}-box.png?v=1`,
    img_pour: `https://cdn.example/${id}-pour.png?v=1`,
    description: null,
    sort_order: 0,
    created_at: null,
    updated_at: null,
  };
}

function stock(capsule_id: string, qty: number): StockDbType {
  return { capsule_id, qty, created_at: null, updated_at: null };
}

const CATALOG = [
  capsule("old-fashioned", "Old Fashioned", "whiskey"),
  capsule("margarita", "Margarita", "tequila"),
  capsule("manhattan", "Manhattan", "whiskey"),
  capsule("rum-breeze", "Rum Breeze", "rum"),
  capsule("aviation", "Aviation", "gin"),
  capsule("pineapple-margarita", "Pineapple Margarita", "tequila"),
  capsule("lemon-drop", "Lemon Drop", "vodka"),
];

const STOCK = [
  stock("old-fashioned", 6),
  stock("margarita", 4),
  stock("manhattan", 1),
  stock("rum-breeze", 0),
  stock("aviation", 2),
  stock("pineapple-margarita", 0),
  // lemon-drop is in the catalog but not in the bar
];

const names = (items: ShelfItem[]) => items.map((i) => i.capsule.name);

describe("stockStatus", () => {
  it("is out at 0, low at or under the threshold, in above it", () => {
    expect(stockStatus(0, 2)).toBe("out");
    expect(stockStatus(1, 2)).toBe("low");
    expect(stockStatus(2, 2)).toBe("low");
    expect(stockStatus(3, 2)).toBe("in");
  });
});

describe("buildShelf", () => {
  const shelf = buildShelf(CATALOG, STOCK, 2);

  it("lists only capsules with a stock row", () => {
    expect(names(shelf)).not.toContain("Lemon Drop");
    expect(shelf).toHaveLength(6);
  });

  it("puts in-stock first, alphabetically, then empties alphabetically", () => {
    expect(names(shelf)).toEqual([
      "Aviation",
      "Manhattan",
      "Margarita",
      "Old Fashioned",
      "Pineapple Margarita",
      "Rum Breeze",
    ]);
  });

  it("drops stock rows whose capsule isn't in the catalog", () => {
    expect(buildShelf(CATALOG, [stock("retired", 3)], 2)).toEqual([]);
  });
});

describe("visibleShelf", () => {
  const shelf = buildShelf(CATALOG, STOCK, 2);

  it("hides empty capsules from guests", () => {
    expect(names(visibleShelf(shelf, false, { show_out_to_guests: false }))).toEqual([
      "Aviation",
      "Manhattan",
      "Margarita",
      "Old Fashioned",
    ]);
  });

  it("shows guests the empties when the owner turned that on", () => {
    expect(visibleShelf(shelf, false, { show_out_to_guests: true })).toHaveLength(6);
  });

  it("always shows the owner the whole shelf", () => {
    expect(visibleShelf(shelf, true, { show_out_to_guests: false })).toHaveLength(6);
  });
});

describe("spiritTabs", () => {
  it("keeps All and only the spirits in view, in tab order", () => {
    const guestView = visibleShelf(buildShelf(CATALOG, STOCK, 2), false, undefined);
    // Rum Breeze is the only rum and it's out, so no Rum tab for a guest.
    expect(spiritTabs(guestView)).toEqual(["all", "tequila", "whiskey", "gin"]);
  });

  it("is just All for an empty bar", () => {
    expect(spiritTabs([])).toEqual(["all"]);
  });
});

describe("filters", () => {
  const shelf = buildShelf(CATALOG, STOCK, 2);

  it("filters by spirit", () => {
    expect(names(filterBySpirit(shelf, "whiskey"))).toEqual(["Manhattan", "Old Fashioned"]);
    expect(filterBySpirit(shelf, "all")).toBe(shelf);
  });

  it("parses the ?spirit= param, defaulting to all", () => {
    expect(parseSpiritFilter("whiskey")).toBe("whiskey");
    expect(parseSpiritFilter("multi")).toBe("multi");
    expect(parseSpiritFilter("absinthe")).toBe("all");
    expect(parseSpiritFilter(null)).toBe("all");
  });

  it("titles the toolbar by role and filter", () => {
    expect(filterTitle("all", false)).toBe("Everything in stock");
    expect(filterTitle("all", true)).toBe("Whole shelf");
    expect(filterTitle("whiskey", false)).toBe("Whiskey cocktails");
    expect(filterTitle("multi", true)).toBe("Mixed cocktails");
  });
});

describe("search", () => {
  const shelf = buildShelf(CATALOG, STOCK, 2);

  it("matches the name or the spirit, ignoring case and stray spaces", () => {
    expect(names(searchShelf(shelf, " MARG "))).toEqual(["Margarita", "Pineapple Margarita"]);
    expect(names(searchShelf(shelf, "whiskey"))).toEqual(["Manhattan", "Old Fashioned"]);
  });

  it("leaves the shelf alone for an empty query", () => {
    expect(searchShelf(shelf, "  ")).toBe(shelf);
  });
});

describe("catalog (Add a capsule)", () => {
  const catalogNames = (capsules: CapsuleDbType[]) => capsules.map((c) => c.name);

  it("lists the whole catalog A–Z without reordering the cached array", () => {
    const before = [...CATALOG];
    expect(catalogNames(catalogRows(CATALOG, "all", ""))).toEqual([
      "Aviation",
      "Lemon Drop",
      "Manhattan",
      "Margarita",
      "Old Fashioned",
      "Pineapple Margarita",
      "Rum Breeze",
    ]);
    expect(CATALOG).toEqual(before);
  });

  it("narrows by spirit tab and search together", () => {
    expect(catalogNames(catalogRows(CATALOG, "tequila", ""))).toEqual([
      "Margarita",
      "Pineapple Margarita",
    ]);
    expect(catalogNames(catalogRows(CATALOG, "tequila", "pine"))).toEqual(["Pineapple Margarita"]);
    expect(catalogRows(CATALOG, "whiskey", "marg")).toEqual([]);
  });

  it("offers a tab for each spirit in the catalog, in tab order", () => {
    expect(catalogTabs(CATALOG)).toEqual(["all", "vodka", "tequila", "whiskey", "rum", "gin"]);
  });
});

describe("shelfTotals", () => {
  it("sums capsules and counts pourable cocktails", () => {
    const shelf = buildShelf(CATALOG, STOCK, 2);
    expect(shelfTotals(shelf)).toEqual({ capsules: 13, cocktails: 4 });
  });
});

describe("lowItems", () => {
  it("is low and out capsules, emptiest first, then by name", () => {
    const shelf = buildShelf(CATALOG, STOCK, 2);
    expect(names(lowItems(shelf))).toEqual([
      "Pineapple Margarita",
      "Rum Breeze",
      "Manhattan",
      "Aviation",
    ]);
  });

  it("follows the threshold", () => {
    expect(names(lowItems(buildShelf(CATALOG, STOCK, 4)))).toContain("Margarita");
    expect(names(lowItems(buildShelf(CATALOG, STOCK, 1)))).not.toContain("Aviation");
  });

  it("previews three names, with an ellipsis past that", () => {
    const low = lowItems(buildShelf(CATALOG, STOCK, 2));
    expect(lowNamesPreview(low)).toBe("Pineapple Margarita, Rum Breeze, Manhattan…");
    expect(lowNamesPreview(low.slice(0, 2))).toBe("Pineapple Margarita, Rum Breeze");
  });
});

describe("item copy", () => {
  const shelf = buildShelf(CATALOG, STOCK, 2);
  const byName = (n: string) => shelf.find((i) => i.capsule.name === n) as ShelfItem;

  it("captions grid cards", () => {
    expect(gridCaption(byName("Old Fashioned"))).toBe("Whiskey");
    expect(gridCaption(byName("Manhattan"))).toBe("Whiskey · low");
    expect(gridCaption(byName("Rum Breeze"))).toBe("Out");
  });

  it("labels the quantity pill", () => {
    expect(qtyPillText(byName("Old Fashioned"))).toBe("×6");
    expect(qtyPillText(byName("Rum Breeze"))).toBe("Out");
  });

  it("has short and long status lines", () => {
    expect(statusShort(byName("Old Fashioned"))).toBe("6 left");
    expect(statusShort(byName("Manhattan"))).toBe("Only 1 left");
    expect(statusShort(byName("Rum Breeze"))).toBe("Out");
    expect(statusLong(byName("Old Fashioned"))).toBe("6 in the bar");
    expect(statusLong(byName("Manhattan"))).toBe("Running low · 1 left");
    expect(statusLong(byName("Rum Breeze"))).toBe("Out of stock");
  });

  it("pluralizes", () => {
    expect(plural(1, "capsule")).toBe("1 capsule");
    expect(plural(51, "capsule")).toBe("51 capsules");
    expect(plural(0, "cocktail")).toBe("0 cocktails");
  });
});

describe("guest link", () => {
  it("puts the key in the sign-in URL's fragment", () => {
    expect(guestLink("https://bar.example", "AbC-_123")).toBe(
      "https://bar.example/sign-in#k=AbC-_123",
    );
  });

  it("reads the key back out of location.hash", () => {
    expect(joinKeyFromHash("#k=AbC-_123")).toBe("AbC-_123");
    const link = new URL(guestLink("https://bar.example", "AbC-_123"));
    expect(joinKeyFromHash(link.hash)).toBe("AbC-_123");
  });

  it("finds no key on a plain visit", () => {
    expect(joinKeyFromHash("")).toBeNull();
    expect(joinKeyFromHash("#")).toBeNull();
    expect(joinKeyFromHash("#k=")).toBeNull();
    expect(joinKeyFromHash("#other=1")).toBeNull();
  });
});
