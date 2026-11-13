---------------------------------------------------------------------------------------------
-- Roles. There are only two: the owner (one person, by email) and guests (anyone who knew
-- the house code). Every RLS policy and RPC in this schema gates on these.
--
-- SECURITY DEFINER so policies can call them without granting anyone read access to
-- auth.users, guests or settings_private. Policies wrap them as `(SELECT is_member())` so
-- Postgres evaluates them once per statement, not once per row.

-- The owner signed in by magic link with settings_private.owner_email. Checked against
-- auth.users rather than the JWT's email claim so it reflects the confirmed address and
-- can never match an anonymous session.
CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    JOIN settings_private sp ON lower(sp.owner_email) = lower(u.email)
    WHERE u.id = auth.uid()
      AND NOT u.is_anonymous
      AND u.email_confirmed_at IS NOT NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_guest()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM guests WHERE user_id = auth.uid());
$$;

-- Anyone allowed to see the bar. A signed-in session that is neither (an anonymous session
-- that hasn't entered the code yet, or a magic link sent to the wrong address) sees nothing.
CREATE OR REPLACE FUNCTION public.is_member()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT is_owner() OR is_guest();
$$;

-- Who the app should greet: one row, or none for a non-member. The owner wins if somehow both.
CREATE OR REPLACE FUNCTION public.get_me()
RETURNS TABLE (role TEXT, name TEXT)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT 'owner'::text, s.owner_name FROM settings s WHERE s.id = 1 AND is_owner()
  UNION ALL
  SELECT 'guest'::text, g.name FROM guests g WHERE g.user_id = auth.uid() AND NOT is_owner()
  LIMIT 1;
$$;

CREATE POLICY "settings: owner updates" ON settings
  FOR UPDATE TO authenticated
  USING ((SELECT is_owner()))
  WITH CHECK ((SELECT is_owner()));

-- Owner-only: change the house code. Also signs every current guest out of the bar (their
-- guests rows go), because the usual reason to change a code is that it got around.
CREATE OR REPLACE FUNCTION public.set_house_code(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_owner() THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;
  IF p_code IS NULL OR p_code !~ '^[0-9]{4}$' THEN
    RAISE EXCEPTION 'house_code_must_be_4_digits' USING ERRCODE = '22023';
  END IF;

  UPDATE settings_private
  SET house_code_hash = extensions.crypt(p_code, extensions.gen_salt('bf'))
  WHERE id = 1;
  DELETE FROM guests WHERE true;
  DELETE FROM guest_join_attempts WHERE true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_house_code(TEXT) FROM PUBLIC, anon;
