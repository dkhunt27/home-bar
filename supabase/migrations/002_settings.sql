---------------------------------------------------------------------------------------------
-- settings: single row, readable by anyone. The sign-in screen shows bar_name before anyone
-- is signed in, so nothing secret may live here; see settings_private.

CREATE TABLE settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  bar_name TEXT NOT NULL DEFAULT 'The Home Bar',
  -- "{owner_name}'s Cabinet", and the actor name on the owner's activity rows.
  owner_name TEXT NOT NULL DEFAULT 'Sam',
  -- An item at or below this count is "running low". The Manage stepper clamps it to 1-8.
  low_threshold INT NOT NULL DEFAULT 2 CHECK (low_threshold BETWEEN 1 AND 8),
  -- Guests normally only see what's in stock; the owner always sees the whole shelf.
  show_out_to_guests BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings (id) VALUES (1);

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings: public read" ON settings
  FOR SELECT TO anon, authenticated USING (true);
-- The owner-update policy is in 004_roles.sql, after is_owner() exists.

---------------------------------------------------------------------------------------------
-- settings_private: who the owner is, and the house code. RLS on with no policies at all, so
-- the Data API can never return it; only SECURITY DEFINER functions (is_owner(), join_bar())
-- and the service role read it. Both columns start empty: a fresh project has no owner and
-- no house code until someone runs supabase/snippets/configure-bar.sql.

CREATE TABLE settings_private (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  -- Whoever signs in by magic link with this address is the owner (is_owner()).
  owner_email TEXT,
  -- bcrypt hash of the 4-digit house code (extensions.crypt). Never the code itself.
  house_code_hash TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO settings_private (id) VALUES (1);

CREATE TRIGGER update_settings_private_updated_at BEFORE UPDATE ON settings_private
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE settings_private ENABLE ROW LEVEL SECURITY;
