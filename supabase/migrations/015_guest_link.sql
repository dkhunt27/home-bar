---------------------------------------------------------------------------------------------
-- Guests join by link instead of typing a house code. The owner shows the QR code on Manage
-- → Guest link (or texts the link); it carries a random key in its #fragment, and the guest
-- only types their name. Supersedes the house code in 002, 003, 004, 005 and 014.
--
-- The key is 144 random bits, so guessing one is hopeless and join_bar() no longer
-- throttles. That also retires the shared lockout, which let anyone hammering wrong codes
-- keep real guests out for as long as they kept at it.

DROP FUNCTION public.join_bar(TEXT, TEXT);
DROP FUNCTION public.set_house_code(TEXT);
DROP TABLE guest_join_attempts;

ALTER TABLE settings_private DROP COLUMN house_code_hash;
-- Plain text, unlike the old code's bcrypt hash: the owner needs to show it again (the QR
-- code), and a random key this long doesn't need a slow hash to resist guessing. RLS with
-- no policies still keeps it out of the Data API; only get_join_key() (owner) and
-- join_bar() read it.
ALTER TABLE settings_private ADD COLUMN join_key TEXT;

-- 18 random bytes as base64url: 24 characters, no padding, nothing to escape in a URL.
CREATE OR REPLACE FUNCTION public.new_join_key()
RETURNS TEXT
LANGUAGE sql
VOLATILE
SET search_path = public
AS $$
  SELECT translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/', '-_');
$$;

REVOKE EXECUTE ON FUNCTION public.new_join_key() FROM PUBLIC, anon, authenticated;

-- Guests already in stay in; the owner finds the new link on Manage.
UPDATE settings_private SET join_key = new_join_key() WHERE id = 1;

---------------------------------------------------------------------------------------------
-- guest_join_alerts: an outbox, like low_stock_alerts. join_bar() queues a row per new guest
-- and the Worker's cron (worker/guest-joins.ts) emails the owner, so a name they don't know
-- stands out. RLS on with no policies: only the service role touches it.

CREATE TABLE guest_join_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_guest_join_alerts_pending ON guest_join_alerts(created_at)
  WHERE notified_at IS NULL;

ALTER TABLE guest_join_alerts ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------------------------
-- join_bar: turn the caller's (anonymous) session into a guest if the link's key is right.
-- Returns a status instead of raising, for the sign-in screen to put into words:
--   'ok' | 'no_name' | 'bad_key' | 'not_configured' | 'not_signed_in'

CREATE FUNCTION public.join_bar(p_name TEXT, p_key TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT := left(btrim(coalesce(p_name, '')), 40);
  v_key TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'not_signed_in';
  END IF;
  IF v_name = '' THEN
    RETURN 'no_name';
  END IF;

  SELECT join_key INTO v_key FROM settings_private WHERE id = 1;
  IF v_key IS NULL THEN
    RETURN 'not_configured';
  END IF;
  IF p_key IS DISTINCT FROM v_key THEN
    RETURN 'bad_key';
  END IF;

  UPDATE guests SET name = v_name WHERE user_id = v_uid;
  IF NOT FOUND THEN
    INSERT INTO guests (user_id, name) VALUES (v_uid, v_name);
    INSERT INTO guest_join_alerts (guest_name) VALUES (v_name);
  END IF;
  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_bar(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_bar(TEXT, TEXT) TO authenticated;

---------------------------------------------------------------------------------------------
-- Owner-only: the current key, for the Guest link screen's QR code.
CREATE OR REPLACE FUNCTION public.get_join_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT join_key FROM settings_private WHERE id = 1);
END;
$$;

-- Owner-only: a new key, which retires the old link. Also signs every current guest out of
-- the bar (their guests rows go), because the usual reason is that the link got around.
CREATE OR REPLACE FUNCTION public.rotate_join_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key TEXT;
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;

  UPDATE settings_private SET join_key = new_join_key() WHERE id = 1
  RETURNING join_key INTO v_key;
  DELETE FROM guests WHERE true;
  RETURN v_key;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_join_key() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rotate_join_key() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_join_key() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rotate_join_key() TO authenticated;

---------------------------------------------------------------------------------------------
-- The Worker's side of the guest_join_alerts outbox, the same claim/release shape as
-- 012_low_stock_alert_claims.sql. Service role only: the result includes the owner's email.
--   { "alert_ids": [...], "to": "owner@...", "bar_name": "...", "names": ["Jess", ...] }
CREATE OR REPLACE FUNCTION public.claim_guest_join_alerts()
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE guest_join_alerts SET notified_at = now()
    WHERE notified_at IS NULL
    RETURNING id, guest_name, created_at
  )
  SELECT jsonb_build_object(
    'alert_ids', coalesce(jsonb_agg(c.id), '[]'::jsonb),
    'to', (SELECT owner_email FROM settings_private WHERE id = 1),
    'bar_name', (SELECT bar_name FROM settings WHERE id = 1),
    'names', coalesce(jsonb_agg(c.guest_name ORDER BY c.created_at), '[]'::jsonb)
  )
  FROM claimed c;
$$;

CREATE OR REPLACE FUNCTION public.release_guest_join_alerts(p_ids UUID[])
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE guest_join_alerts SET notified_at = NULL WHERE id = ANY(p_ids);
$$;

REVOKE EXECUTE ON FUNCTION public.claim_guest_join_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_guest_join_alerts(UUID[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_guest_join_alerts() TO service_role;
GRANT EXECUTE ON FUNCTION public.release_guest_join_alerts(UUID[]) TO service_role;

---------------------------------------------------------------------------------------------
-- Deletes anonymous users that aren't guests and haven't been used for a day: bots that
-- signed in and left, people who opened the sign-in screen but never joined, and guests a
-- new link signed out. The Worker's cron runs it (worker/index.ts). The day's grace means
-- nobody mid-join loses their session, and any access token a deleted user still holds
-- expired long ago (they last an hour), so their app just signs out and starts over.
-- activity.actor_id has no FK, so their pours stay in the log.
CREATE OR REPLACE FUNCTION public.delete_stale_anonymous_users()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INT;
BEGIN
  DELETE FROM auth.users u
  WHERE u.is_anonymous
    AND u.created_at < now() - interval '1 day'
    AND NOT EXISTS (SELECT 1 FROM guests g WHERE g.user_id = u.id)
    AND NOT EXISTS (
      SELECT 1 FROM auth.sessions s
      WHERE s.user_id = u.id
        AND greatest(s.created_at, s.updated_at, s.refreshed_at) > now() - interval '1 day'
    );
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_stale_anonymous_users() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_stale_anonymous_users() TO service_role;
