// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { CapsuleDbType, CollectionDbType, SpiritType, StockDbType } from "../types";
import {
  buildShelf,
  catalogRows,
  catalogTabs,
  collectionContents,
  collectionRows,
  collectionView,
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

function capsule(id: string, name: string, spirit: SpiritType, soldSingle = true): CapsuleDbType {
  return {
    id,
    name,
    spirit,
    img_box: `https://cdn.example/${id}-box.png?v=1`,
    img_pour: `https://cdn.example/${id}-pour.png?v=1`,
    description: null,
    sort_order: 0,
    sold_single: soldSingle,
    created_at: null,
    updated_at: null,
  };
}

function collection(id: string, name: string, items: Record<string, number>): CollectionDbType {
  return {
    id,
    name,
    img: `https://cdn.example/${id}.png?v=1`,
    sort_order: 0,
    created_at: null,
    updated_at: null,
    collection_items: Object.entries(items).map(([capsule_id, qty]) => ({ capsule_id, qty })),
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

  it("leaves out cocktails that only come in a collection", () => {
    const withExclusive = [...CATALOG, capsule("frosty-navel", "Frosty Navel", "vodka", false)];
    expect(catalogNames(catalogRows(withExclusive, "vodka", ""))).toEqual(["Lemon Drop"]);
  });
});

describe("collections (Add a capsule)", () => {
  const CAPSULES = [
    ...CATALOG,
    capsule("frosty-navel", "Frosty Navel", "vodka", false),
    capsule("peary-christmas", "Peary Christmas", "tequila", false),
    capsule("berry-and-bright", "Berry & Bright", "tequila", false),
  ];
  const FESTIVE = collection("festive", "Festive Collection", {
    "peary-christmas": 2,
    "frosty-navel": 2,
    "berry-and-bright": 2,
    "lemon-drop": 2,
  });
  const CLASSIC = collection("classic", "Classic Collection Favorites", {
    "old-fashioned": 1,
    margarita: 1,
  });
  const RUM = collection("rum-lovers", "Rum Lovers Variety Pack", { "rum-breeze": 8 });
  const ALL = [RUM, FESTIVE, CLASSIC];
  const packNames = (rows: { collection: CollectionDbType }[]) =>
    rows.map((r) => r.collection.name);

  it("looks up the cocktails A–Z and sizes the box", () => {
    const view = collectionView(FESTIVE, new Map(CAPSULES.map((c) => [c.id, c])));
    expect(view.items.map((i) => i.capsule.name)).toEqual([
      "Berry & Bright",
      "Frosty Navel",
      "Lemon Drop",
      "Peary Christmas",
    ]);
    expect(view.size).toBe(8);
  });

  it("skips a cocktail missing from the catalog", () => {
    const view = collectionView(collection("x", "X", { nope: 2, margarita: 2 }), new Map());
    expect(view.items).toEqual([]);
    expect(view.size).toBe(0);
  });

  it("lists packs A–Z", () => {
    expect(packNames(collectionRows(ALL, CAPSULES, "all", ""))).toEqual([
      "Classic Collection Favorites",
      "Festive Collection",
      "Rum Lovers Variety Pack",
    ]);
  });

  it("shows a pack under every spirit it has a cocktail of", () => {
    expect(packNames(collectionRows(ALL, CAPSULES, "tequila", ""))).toEqual([
      "Classic Collection Favorites",
      "Festive Collection",
    ]);
    expect(packNames(collectionRows(ALL, CAPSULES, "rum", ""))).toEqual([
      "Rum Lovers Variety Pack",
    ]);
  });

  it("searches the pack's name and the cocktails in it", () => {
    expect(packNames(collectionRows(ALL, CAPSULES, "all", " FROSTY "))).toEqual([
      "Festive Collection",
    ]);
    expect(packNames(collectionRows(ALL, CAPSULES, "all", "variety"))).toEqual([
      "Rum Lovers Variety Pack",
    ]);
    expect(collectionRows(ALL, CAPSULES, "rum", "frosty")).toEqual([]);
  });

  it("says what's in the box", () => {
    const byId = new Map(CAPSULES.map((c) => [c.id, c]));
    expect(collectionContents(collectionView(FESTIVE, byId).items)).toBe(
      "2 each of Berry & Bright, Frosty Navel, Lemon Drop and Peary Christmas",
    );
    expect(collectionContents(collectionView(RUM, byId).items)).toBe("8 Rum Breeze");
    const uneven = collection("u", "U", { margarita: 2, manhattan: 1 });
    expect(collectionContents(collectionView(uneven, byId).items)).toBe(
      "1 Manhattan and 2 Margarita",
    );
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
