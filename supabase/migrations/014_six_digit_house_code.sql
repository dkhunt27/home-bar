---------------------------------------------------------------------------------------------
-- House codes are 6 digits, not 4. join_bar() never checked the length (it just compares
-- hashes), so only set_house_code()'s format check changes here. The sign-in form enforces
-- the same length (HOUSE_CODE_LENGTH in src/pages/sign-in-page.tsx).
--
-- This supersedes the 4-digit wording in 002, 003 and 005. It also changes the throttle math
-- in 005: at most 120 wrong guesses an hour against 1,000,000 codes is ~8,000 hours to find
-- one on average, versus ~40 for a 4-digit code.

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
  IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'house_code_must_be_6_digits' USING ERRCODE = '22023';
  END IF;

  UPDATE settings_private
  SET house_code_hash = extensions.crypt(p_code, extensions.gen_salt('bf'))
  WHERE id = 1;
  DELETE FROM guests WHERE true;
  DELETE FROM guest_join_attempts WHERE true;
END;
$$;
