---------------------------------------------------------------------------------------------
-- take_capsule: pour one. Atomic: the decrement only happens if one is left
-- (`qty > 0` in the UPDATE's WHERE), so two guests tapping the last Margarita at once can't
-- take it twice; the second gets 'out_of_stock'. The actor name comes from the caller's own
-- session (get_me), never from the client.
--
-- Returns the activity row id (for undo), the count left, and whether that's now low.

CREATE OR REPLACE FUNCTION public.take_capsule(p_capsule_id TEXT)
RETURNS TABLE (activity_id UUID, qty INT, is_low BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_name TEXT;
  v_qty INT;
  v_threshold INT;
  v_activity_id UUID;
  v_last_box TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT me.name INTO v_name FROM get_me() me;
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'not_member' USING ERRCODE = '42501';
  END IF;

  UPDATE stock s SET qty = s.qty - 1
  WHERE s.capsule_id = p_capsule_id AND s.qty > 0
  RETURNING s.qty INTO v_qty;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'out_of_stock' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO activity (capsule_id, actor_id, actor_name, kind, amount)
  VALUES (p_capsule_id, auth.uid(), v_name, 'take', 1)
  RETURNING id INTO v_activity_id;

  SELECT s.low_threshold INTO v_threshold FROM settings s WHERE s.id = 1;

  -- Queue an owner alert once when a capsule first runs low, and once more when it runs
  -- out, per "episode" (since its last box) — not on every pour in between. Undoing the
  -- take that queued one withdraws it (FK cascade), so the next pour re-queues.
  IF v_qty <= v_threshold THEN
    SELECT max(a.created_at) INTO v_last_box
    FROM activity a
    WHERE a.capsule_id = p_capsule_id AND a.kind IN ('add', 'restock');

    IF NOT EXISTS (
      SELECT 1 FROM low_stock_alerts l
      WHERE l.capsule_id = p_capsule_id
        AND l.created_at > coalesce(v_last_box, '-infinity'::timestamptz)
        AND (l.qty = 0) = (v_qty = 0)
    ) THEN
      INSERT INTO low_stock_alerts (capsule_id, activity_id, qty)
      VALUES (p_capsule_id, v_activity_id, v_qty);
    END IF;
  END IF;

  RETURN QUERY SELECT v_activity_id, v_qty, v_qty <= v_threshold;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.take_capsule(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.take_capsule(TEXT) TO authenticated;

---------------------------------------------------------------------------------------------
-- undo_take: put it back. Only your own take, only within 5 minutes (the Cheers screen's
-- Undo button). Adds the one back and deletes the log row, which also withdraws any
-- not-yet-sent low-stock alert it queued. Returns the count after.

CREATE OR REPLACE FUNCTION public.undo_take(p_activity_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_act activity%ROWTYPE;
  v_qty INT;
BEGIN
  SELECT * INTO v_act FROM activity a WHERE a.id = p_activity_id FOR UPDATE;
  IF NOT FOUND OR v_act.kind <> 'take' OR v_act.actor_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'undo_not_allowed' USING ERRCODE = 'P0001';
  END IF;
  IF v_act.created_at < now() - interval '5 minutes' THEN
    RAISE EXCEPTION 'undo_expired' USING ERRCODE = 'P0001';
  END IF;

  UPDATE stock s SET qty = s.qty + v_act.amount
  WHERE s.capsule_id = v_act.capsule_id
  RETURNING s.qty INTO v_qty;

  DELETE FROM activity a WHERE a.id = p_activity_id;
  RETURN v_qty;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.undo_take(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_take(UUID) TO authenticated;
