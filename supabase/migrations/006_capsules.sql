---------------------------------------------------------------------------------------------
-- capsules: the Bartesian catalog (single cocktails only). Rows come from
-- 007_capsules_catalog.sql, generated from design/capsules.json by
-- tools/gen-catalog-migration.mjs. Being in the catalog doesn't mean it's in the bar; that's
-- a stock row.
--
-- Public read: the sign-in screen's preview strip shows capsules before anyone is signed in,
-- and it's Bartesian's own public product list anyway. Nobody writes it from the app.

CREATE TABLE capsules (
  -- Bartesian's Shopify product handle, e.g. 'old-fashioned-cocktails'.
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  spirit TEXT NOT NULL CHECK (spirit IN ('vodka', 'tequila', 'whiskey', 'rum', 'gin', 'multi')),
  -- Shopify CDN URLs. img_box is the box + capsule + drink composite, img_pour the drink
  -- alone. Both are shot on white; the app always shows them multiplied onto the tile color.
  img_box TEXT NOT NULL,
  img_pour TEXT NOT NULL,
  description TEXT,
  -- Catalog order, as Bartesian lists it; the Add-a-capsule screen keeps it.
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_capsules_updated_at BEFORE UPDATE ON capsules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE capsules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "capsules: public read" ON capsules
  FOR SELECT TO anon, authenticated USING (true);
