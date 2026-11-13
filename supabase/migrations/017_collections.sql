---------------------------------------------------------------------------------------------
-- Collections: Bartesian's variety packs (Festive, Lemon Drop, Rum Lovers...). A collection is
-- a box of several cocktails, usually 2 each of 4. It never sits on the shelf as itself:
-- add_collection_box() (019_boxes.sql) puts each cocktail in it on the shelf, so guests still
-- pick the exact flavor. Rows come from 018_collections_catalog.sql, generated from
-- supabase/catalog/collections.json by tools/gen-collections-migration.mjs.
--
-- Some of those cocktails come only in a collection (Frosty Navel, Peary Christmas...). They
-- are ordinary capsules otherwise, but Bartesian sells no box of 8 of them, so the Add screen
-- leaves them out of its singles list.

ALTER TABLE capsules ADD COLUMN sold_single BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE collections (
  -- Bartesian's Shopify product handle, e.g. 'festive-collection'.
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Shopify CDN URL, shot on white like the capsule photos.
  img TEXT NOT NULL,
  -- Catalog order, as Bartesian lists it.
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- What's in the box: qty of each cocktail (2 each of 4 for most).
CREATE TABLE collection_items (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  qty INT NOT NULL CHECK (qty > 0),
  PRIMARY KEY (collection_id, capsule_id)
);

CREATE INDEX idx_collection_items_capsule_id ON collection_items(capsule_id);

-- Bartesian's public product list, like capsules. Only the owner's Add screen reads it, but
-- there's nothing in it to hide from guests.
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections: public read" ON collections
  FOR SELECT TO authenticated USING (true);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collection_items: public read" ON collection_items
  FOR SELECT TO authenticated USING (true);

-- 016_table_grants.sql: new tables start with no privileges.
GRANT SELECT ON collections, collection_items TO authenticated;
GRANT ALL ON collections, collection_items TO service_role;
