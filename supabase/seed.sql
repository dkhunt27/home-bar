-- =============================================================================
-- Local dev seed (runs on every `supabase db reset`; never on a remote project).
--   Owner:  owner@homebar.dev, by magic link. The email lands in Mailpit,
--           http://127.0.0.1:55324
--   Guests: http://localhost:5174/sign-in#k=local-guest-key, then any name
-- Stock and activity mirror the design prototype's START / seedLog, so the app looks like
-- design/screenshots/ out of the box.
-- =============================================================================

UPDATE settings SET owner_name = 'Sam', bar_name = 'The Home Bar', low_threshold = 2 WHERE id = 1;

UPDATE settings_private
SET owner_email = 'owner@homebar.dev',
    join_key = 'local-guest-key'
WHERE id = 1;

-- The owner's user. Magic links only go to existing users (use-auth.tsx asks with
-- shouldCreateUser: false), so it has to exist before the first sign-in. The empty token
-- columns are NULL-able, but the auth server can't read a NULL there.
INSERT INTO auth.users (
  instance_id, id, aud, role, email, email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change, created_at, updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000', 'a0000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', 'owner@homebar.dev', now(),
  '{"provider": "email", "providers": ["email"]}', '{}', '', '', '', '', now(), now()
);

INSERT INTO auth.identities (
  id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
) VALUES (
  gen_random_uuid(), 'a0000000-0000-4000-8000-000000000001',
  'a0000000-0000-4000-8000-000000000001', 'email',
  jsonb_build_object(
    'sub', 'a0000000-0000-4000-8000-000000000001',
    'email', 'owner@homebar.dev',
    'email_verified', true
  ),
  now(), now(), now()
);

INSERT INTO stock (capsule_id, qty) VALUES
  ('old-fashioned-cocktails', 6),
  ('margarita-cocktails', 4),
  ('espresso-martini-capsules', 2),
  ('cosmopolitan-martini-cocktails', 5),
  ('whiskey-sour-cocktails', 3),
  ('manhattan-cocktails', 1),
  ('mai-tai-cocktails', 4),
  ('hurricane', 2),
  ('aviation-cocktails', 3),
  ('bees-knees', 1),
  ('spicy-margarita-cocktails', 6),
  ('vodka-martini-lemon-drop-cocktails', 7),
  ('long-island-iced-tea-cocktails', 2),
  ('rum-breeze-cocktails', 0),
  ('paper-plane-cocktails', 3),
  ('pineapple-margarita-capsules', 0),
  ('caramel-appletini', 5);

INSERT INTO activity (capsule_id, actor_name, kind, amount, created_at) VALUES
  ('margarita-cocktails', 'Jess', 'take', 1, now() - interval '38 minutes'),
  ('old-fashioned-cocktails', 'Mike', 'take', 1, now() - interval '95 minutes'),
  ('spicy-margarita-cocktails', 'Jess', 'take', 1, now() - interval '110 minutes'),
  ('vodka-martini-lemon-drop-cocktails', 'Sam', 'restock', 8, now() - interval '26 hours'),
  ('espresso-martini-capsules', 'Priya', 'take', 1, now() - interval '28 hours'),
  ('manhattan-cocktails', 'Priya', 'take', 1, now() - interval '29 hours'),
  ('caramel-appletini', 'Sam', 'add', 8, now() - interval '74 hours');

-- Best-by dates (owner only, so the screenshots don't change). The stock rows above went in as
-- one undated box each (019_boxes.sql); date a few so the Expiring screen has every group.
UPDATE boxes SET expires_on = current_date - 4 WHERE capsule_id = 'manhattan-cocktails';
UPDATE boxes SET expires_on = current_date + 9 WHERE capsule_id = 'espresso-martini-capsules';
UPDATE boxes SET expires_on = current_date + 23 WHERE capsule_id = 'old-fashioned-cocktails';
UPDATE boxes SET expires_on = current_date + 150
WHERE capsule_id IN ('margarita-cocktails', 'caramel-appletini');
