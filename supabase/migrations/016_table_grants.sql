---------------------------------------------------------------------------------------------
-- Table privileges, spelled out. The hosted project doesn't grant new tables to the API roles
-- the way the local stack does, so in production every table read (the app's and the service
-- role's) failed with "permission denied" while working locally. RLS still decides which
-- rows; these decide which statements can run at all, and they follow the rules: the Data
-- API is read-only except the owner's settings UPDATE.

-- Start from nothing, so the local stack matches production now and for future tables: a
-- migration that forgets its grants fails locally too, instead of only once it ships.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, service_role;

-- The sign-in screen shows the bar name and three capsule photos before anyone signs in.
GRANT SELECT ON settings, capsules TO anon;
GRANT SELECT ON settings, capsules, stock, activity TO authenticated;
-- RLS limits it to the owner (004_roles.sql).
GRANT UPDATE ON settings TO authenticated;

-- The admin key (the Worker, tools/add-owner.mjs). It bypasses RLS anyway.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
