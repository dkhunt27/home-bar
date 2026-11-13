---------------------------------------------------------------------------------------------
-- Owner-only stock changes.

-- add_box: +8 (one Bartesian box). Logs 'add' if the capsule wasn't in the bar yet (creates
-- its stock row), otherwise 'restock'. Used by Manage's "+8 box", the Detail shelf-count
-- card, and the Add-a-capsule screen. Returns the new count.
CREATE OR REPLACE FUNCTION public.add_box(p_capsule_id TEXT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  box_size CONSTANT INT := 8;
  v_owner_name TEXT;
  v_was_in_bar BOOLEAN;
  v_qty INT;
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  SELECT s.owner_name INTO v_owner_name FROM settings s WHERE s.id = 1;
  SELECT EXISTS (SELECT 1 FROM stock s WHERE s.capsule_id = p_capsule_id) INTO v_was_in_bar;

  INSERT INTO stock (capsule_id, qty) VALUES (p_capsule_id, box_size)
  ON CONFLICT (capsule_id) DO UPDATE SET qty = stock.qty + box_size
  RETURNING stock.qty INTO v_qty;

  INSERT INTO activity (capsule_id, actor_id, actor_name, kind, amount)
  VALUES (
    p_capsule_id, auth.uid(), v_owner_name,
    CASE WHEN v_was_in_bar THEN 'restock' ELSE 'add' END, box_size
  );

  RETURN v_qty;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.add_box(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_box(TEXT) TO authenticated;

-- adjust_stock: a +1/-1 shelf-count correction (never below 0). Relative rather than "set to
-- n" so a burst of taps on the stepper lands correctly whatever order the requests finish
-- in. Not logged. Returns the new count.
CREATE OR REPLACE FUNCTION public.adjust_stock(p_capsule_id TEXT, p_delta INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_qty INT;
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  UPDATE stock s SET qty = greatest(0, s.qty + p_delta)
  WHERE s.capsule_id = p_capsule_id
  RETURNING s.qty INTO v_qty;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_in_bar' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_qty;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.adjust_stock(TEXT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.adjust_stock(TEXT, INT) TO authenticated;
