---------------------------------------------------------------------------------------------
-- stock: what the owner actually has. A row exists once a capsule has been added to the bar
-- (it stays, at qty 0, when the last one is poured: "out" is different from "not in bar").
--
-- Read-only through the Data API. Every write goes through a SECURITY DEFINER function
-- (take_capsule, undo_take, add_box, adjust_stock) so a count and its activity row always
-- change together, and nobody can set a count directly.

CREATE TABLE stock (
  capsule_id TEXT PRIMARY KEY REFERENCES capsules(id) ON DELETE CASCADE,
  qty INT NOT NULL DEFAULT 0 CHECK (qty >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stock: members read" ON stock
  FOR SELECT TO authenticated USING ((SELECT is_member()));
