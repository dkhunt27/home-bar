---------------------------------------------------------------------------------------------
-- guests: an anonymous Supabase session that has entered the right house code. join_bar()
-- (005_join_bar.sql) is the only way in; is_guest() is just "has a row here".
-- RLS on with no policies: the app learns its own name through get_me(), never by reading
-- this table.

CREATE TABLE guests (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 40),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

---------------------------------------------------------------------------------------------
-- guest_join_attempts: one row per wrong house code, so join_bar() can throttle guessing.
-- A 4-digit code is only 10,000 options; see join_bar() for the limits.

CREATE TABLE guest_join_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_guest_join_attempts_created_at ON guest_join_attempts(created_at);
CREATE INDEX idx_guest_join_attempts_user_id ON guest_join_attempts(user_id);

ALTER TABLE guest_join_attempts ENABLE ROW LEVEL SECURITY;
