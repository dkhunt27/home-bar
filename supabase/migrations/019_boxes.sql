---------------------------------------------------------------------------------------------
-- boxes: best-by dates. One row per box the owner puts on the shelf (one row per cocktail
-- for a collection box), with the date printed on it and how many of that box are left.
-- Owner only, to read and to write: guests never see dates.
--
-- Nobody records which box a guest pours from, so "left" is an estimate: a trigger on stock
-- (sync_boxes, below) keeps the boxes adding up to the shelf count on every change, assuming
-- the soonest best-by gets poured first. That keeps take_capsule, undo_take and adjust_stock
-- exactly as they were; only the functions that add boxes know about dates.

CREATE TABLE boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  -- The collection it came in, for "from Festive Collection" on the Expiring screen.
  collection_id TEXT REFERENCES collections(id) ON DELETE SET NULL,
  -- Printed on the box. NULL when the owner skipped it, and for stock from before dates.
  expires_on DATE,
  -- How many it held when it went on the shelf. Putting some back never overfills it.
  size INT NOT NULL CHECK (size > 0),
  qty INT NOT NULL CHECK (qty >= 0 AND qty <= size),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_boxes_capsule_id ON boxes(capsule_id);

ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boxes: owner read" ON boxes
  FOR SELECT TO authenticated USING ((SELECT is_owner()));

-- 016_table_grants.sql: new tables start with no privileges. Reads only; writes go through
-- the functions below.
GRANT SELECT ON boxes TO authenticated;
GRANT ALL ON boxes TO service_role;

-- What's on the shelf now goes in as one undated box per capsule, so the boxes add up to the
-- counts from the start. The owner can date them on the Expiring screen.
INSERT INTO boxes (capsule_id, size, qty)
SELECT s.capsule_id, s.qty, s.qty FROM stock s WHERE s.qty > 0;

---------------------------------------------------------------------------------------------
-- sync_boxes: after any change to a count, move the boxes by the difference.
--   Fewer: pour from the soonest best-by first (undated last).
--   More (an undo, a +1 fix): put them back where the last pour most likely came from, the
--   reverse of the above: the soonest box that's been opened, else the last one emptied.
--   Anything past every box's size is stock nobody dated.
-- The functions that add a box insert its row before raising the count, so for them the
-- difference is already zero.

CREATE OR REPLACE FUNCTION public.sync_boxes()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_diff INT;
  v_box RECORD;
  v_n INT;
BEGIN
  SELECT NEW.qty - coalesce(sum(b.qty), 0) INTO v_diff
  FROM boxes b WHERE b.capsule_id = NEW.capsule_id;

  IF v_diff < 0 THEN
    FOR v_box IN
      SELECT b.id, b.qty AS n FROM boxes b
      WHERE b.capsule_id = NEW.capsule_id AND b.qty > 0
      ORDER BY b.expires_on ASC NULLS LAST, b.created_at, b.id
      FOR UPDATE
    LOOP
      v_n := least(v_box.n, -v_diff);
      UPDATE boxes SET qty = qty - v_n WHERE id = v_box.id;
      v_diff := v_diff + v_n;
      EXIT WHEN v_diff = 0;
    END LOOP;

  ELSIF v_diff > 0 THEN
    FOR v_box IN
      SELECT b.id, b.size - b.qty AS n FROM boxes b
      WHERE b.capsule_id = NEW.capsule_id AND b.qty < b.size
      ORDER BY
        (b.qty > 0) DESC,
        CASE WHEN b.qty > 0 THEN b.expires_on END ASC NULLS LAST,
        CASE WHEN b.qty = 0 THEN b.expires_on END DESC NULLS FIRST,
        b.created_at DESC, b.id
      FOR UPDATE
    LOOP
      v_n := least(v_box.n, v_diff);
      UPDATE boxes SET qty = qty + v_n WHERE id = v_box.id;
      v_diff := v_diff - v_n;
      EXIT WHEN v_diff = 0;
    END LOOP;

    IF v_diff > 0 THEN
      -- Grow the undated box if there is one, so the Expiring screen shows one "no date" row.
      UPDATE boxes SET size = size + v_diff, qty = qty + v_diff
      WHERE id = (
        SELECT b.id FROM boxes b
        WHERE b.capsule_id = NEW.capsule_id AND b.expires_on IS NULL
        ORDER BY b.created_at DESC LIMIT 1
      );
      IF NOT FOUND THEN
        INSERT INTO boxes (capsule_id, size, qty) VALUES (NEW.capsule_id, v_diff, v_diff);
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_boxes AFTER INSERT OR UPDATE OF qty ON stock
  FOR EACH ROW EXECUTE FUNCTION sync_boxes();

---------------------------------------------------------------------------------------------
-- shelve_box: the shared part of add_box and add_collection_box. Not callable from the API;
-- they check the owner first.

CREATE OR REPLACE FUNCTION public.shelve_box(
  p_capsule_id TEXT,
  p_amount INT,
  p_expires_on DATE,
  p_collection_id TEXT,
  p_owner_name TEXT
)
RETURNS INT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_was_in_bar BOOLEAN;
  v_qty INT;
BEGIN
  -- Hold the count, so no pour lands between the box going in and the count going up.
  PERFORM 1 FROM stock s WHERE s.capsule_id = p_capsule_id FOR UPDATE;
  v_was_in_bar := FOUND;

  -- Boxes poured empty have done their job. Left in place, a later +1 fix would refill one.
  DELETE FROM boxes b WHERE b.capsule_id = p_capsule_id AND b.qty = 0;

  -- Undated boxes can't be told apart, so a new one joins the one already there.
  IF p_expires_on IS NULL THEN
    UPDATE boxes b SET size = b.size + p_amount, qty = b.qty + p_amount
    WHERE b.id = (
      SELECT x.id FROM boxes x
      WHERE x.capsule_id = p_capsule_id AND x.expires_on IS NULL
        AND x.collection_id IS NOT DISTINCT FROM p_collection_id
      ORDER BY x.created_at DESC LIMIT 1
    );
  END IF;
  IF p_expires_on IS NOT NULL OR NOT FOUND THEN
    INSERT INTO boxes (capsule_id, collection_id, expires_on, size, qty)
    VALUES (p_capsule_id, p_collection_id, p_expires_on, p_amount, p_amount);
  END IF;

  INSERT INTO stock (capsule_id, qty) VALUES (p_capsule_id, p_amount)
  ON CONFLICT (capsule_id) DO UPDATE SET qty = stock.qty + p_amount
  RETURNING stock.qty INTO v_qty;

  -- 'add' the first time it's in the bar, 'restock' after.
  INSERT INTO activity (capsule_id, actor_id, actor_name, kind, amount)
  VALUES (
    p_capsule_id, auth.uid(), p_owner_name,
    CASE WHEN v_was_in_bar THEN 'restock' ELSE 'add' END, p_amount
  );

  RETURN v_qty;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.shelve_box(TEXT, INT, DATE, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

---------------------------------------------------------------------------------------------
-- add_box: +8 (one Bartesian box), now with its best-by date. Replaces 011's add_box(TEXT);
-- the date defaults to NULL, so a client that doesn't send one still works. Returns the new
-- count.

DROP FUNCTION public.add_box(TEXT);

CREATE FUNCTION public.add_box(p_capsule_id TEXT, p_expires_on DATE DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  box_size CONSTANT INT := 8;
  v_owner_name TEXT;
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT s.owner_name INTO v_owner_name FROM settings s WHERE s.id = 1;
  RETURN shelve_box(p_capsule_id, box_size, p_expires_on, NULL, v_owner_name);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_box(TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_box(TEXT, DATE) TO authenticated;

-- add_collection_box: one variety pack. Each cocktail in it goes on the shelf (and in the
-- activity log) as its own restock, all with the box's one best-by date.
CREATE OR REPLACE FUNCTION public.add_collection_box(
  p_collection_id TEXT,
  p_expires_on DATE DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_name TEXT;
  v_item RECORD;
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT s.owner_name INTO v_owner_name FROM settings s WHERE s.id = 1;

  -- In id order, so two of these at once lock the stock rows in the same order.
  FOR v_item IN
    SELECT ci.capsule_id, ci.qty FROM collection_items ci
    WHERE ci.collection_id = p_collection_id
    ORDER BY ci.capsule_id
  LOOP
    PERFORM shelve_box(v_item.capsule_id, v_item.qty, p_expires_on, p_collection_id, v_owner_name);
  END LOOP;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_collection' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_collection_box(TEXT, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_collection_box(TEXT, DATE) TO authenticated;

-- set_box_expiry: fix or fill in a box's date (NULL clears it). Only the date: what's left in
-- each box stays as it is.
CREATE OR REPLACE FUNCTION public.set_box_expiry(p_box_id UUID, p_expires_on DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  UPDATE boxes SET expires_on = p_expires_on WHERE id = p_box_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'box_gone' USING ERRCODE = 'P0001';
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_box_expiry(UUID, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_box_expiry(UUID, DATE) TO authenticated;
