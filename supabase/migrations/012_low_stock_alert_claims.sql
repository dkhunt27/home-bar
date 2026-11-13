---------------------------------------------------------------------------------------------
-- The Worker's side of the low_stock_alerts outbox (worker/low-stock.ts). Service role only:
-- the result includes the owner's email address.

-- Claims every pending alert (marks it notified) and returns what to email:
--   { "alert_ids": [...], "to": "owner@...", "bar_name": "...", "owner_name": "...",
--     "items": [{ "name": "Margarita", "qty": 1 }, ...] }
-- `items` is only capsules that are *still* low right now (one each, however many alerts
-- it had); a capsule restocked since its alert is claimed silently. Concurrent claims can't
-- double-send: the second UPDATE waits on the first's row locks, then finds nothing pending.
CREATE OR REPLACE FUNCTION public.claim_low_stock_alerts()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH claimed AS (
    UPDATE low_stock_alerts l
    SET notified_at = now()
    WHERE l.notified_at IS NULL
    RETURNING l.id, l.capsule_id
  ),
  still_low AS (
    SELECT DISTINCT c.name, st.qty
    FROM claimed cl
    JOIN capsules c ON c.id = cl.capsule_id
    JOIN stock st ON st.capsule_id = cl.capsule_id
    CROSS JOIN settings s
    WHERE s.id = 1 AND st.qty <= s.low_threshold
  )
  SELECT jsonb_build_object(
    'alert_ids', (SELECT coalesce(jsonb_agg(id), '[]'::jsonb) FROM claimed),
    'to', (SELECT owner_email FROM settings_private WHERE id = 1),
    'bar_name', (SELECT bar_name FROM settings WHERE id = 1),
    'owner_name', (SELECT owner_name FROM settings WHERE id = 1),
    'items', (
      SELECT coalesce(jsonb_agg(jsonb_build_object('name', name, 'qty', qty) ORDER BY qty, name),
                      '[]'::jsonb)
      FROM still_low
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Hands claimed alerts back to the outbox when the email couldn't be sent, so the next
-- flush (the Worker's cron, at worst) retries them.
CREATE OR REPLACE FUNCTION public.release_low_stock_alerts(p_ids UUID[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE low_stock_alerts SET notified_at = NULL WHERE id = ANY(p_ids);
$$;

REVOKE EXECUTE ON FUNCTION public.claim_low_stock_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_low_stock_alerts(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_low_stock_alerts() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_low_stock_alerts(UUID[]) TO service_role;
