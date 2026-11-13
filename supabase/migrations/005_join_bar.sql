---------------------------------------------------------------------------------------------
-- join_bar: turn the caller's (anonymous) session into a guest if the house code is right.
-- The code is checked here, against a bcrypt hash the client can never read, instead of in
-- an edge function; same guarantee, one less thing to deploy.
--
-- Returns a status instead of raising, because a RAISE would roll back the failed-attempt
-- row that the throttle depends on:
--   'ok' | 'no_name' | 'bad_code' | 'locked' | 'not_configured' | 'not_signed_in'
--
-- Throttle, per rolling 15 minutes: 5 wrong codes per session, and 30 across everyone.
-- Supabase also caps anonymous sign-ins at 30/hour per IP (auth.rate_limit.anonymous_users),
-- so trying all 10,000 codes takes days, during which the owner sees nobody can get in. The
-- global cap means a determined guesser can lock real guests out for 15 minutes; for a home
-- bar that's the right trade.

CREATE OR REPLACE FUNCTION public.join_bar(p_name TEXT, p_code TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_name TEXT := left(btrim(coalesce(p_name, '')), 40);
  v_hash TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 'not_signed_in';
  END IF;
  IF v_name = '' THEN
    RETURN 'no_name';
  END IF;

  SELECT house_code_hash INTO v_hash FROM settings_private WHERE id = 1;
  IF v_hash IS NULL THEN
    RETURN 'not_configured';
  END IF;

  DELETE FROM guest_join_attempts WHERE created_at < now() - interval '1 day';

  IF (SELECT count(*) FROM guest_join_attempts
      WHERE user_id = v_uid AND created_at > now() - interval '15 minutes') >= 5
    OR (SELECT count(*) FROM guest_join_attempts
        WHERE created_at > now() - interval '15 minutes') >= 30 THEN
    RETURN 'locked';
  END IF;

  IF p_code IS NULL OR extensions.crypt(p_code, v_hash) <> v_hash THEN
    INSERT INTO guest_join_attempts (user_id) VALUES (v_uid);
    RETURN 'bad_code';
  END IF;

  INSERT INTO guests (user_id, name) VALUES (v_uid, v_name)
  ON CONFLICT (user_id) DO UPDATE SET name = EXCLUDED.name;
  RETURN 'ok';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.join_bar(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_bar(TEXT, TEXT) TO authenticated;
