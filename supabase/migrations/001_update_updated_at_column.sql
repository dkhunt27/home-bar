-- updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- crypt()/gen_salt() for the house code hash. Supabase installs pgcrypto into `extensions`
-- already; this keeps a fresh local stack honest.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
