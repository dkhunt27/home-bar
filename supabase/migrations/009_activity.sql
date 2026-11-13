---------------------------------------------------------------------------------------------
-- activity: every capsule taken, and every box restocked or added. Single +1/-1 shelf-count
-- corrections (adjust_stock) deliberately don't log; they're fixing a miscount, not an event.
-- Visible to every member. Written only by the stock functions.

CREATE TABLE activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  -- auth.users.id of whoever did it, for undo_take's same-person check. No FK: anonymous
  -- guest users can be cleaned out of auth.users, and the log should outlive them.
  actor_id UUID,
  -- Snapshot of the guest's typed name (or the owner's name) at the time.
  actor_name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('take', 'restock', 'add')),
  -- 1 for a take, 8 for a box.
  amount INT NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_created_at ON activity(created_at DESC);
CREATE INDEX idx_activity_capsule_id_kind ON activity(capsule_id, kind, created_at DESC);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity: members read" ON activity
  FOR SELECT TO authenticated USING ((SELECT is_member()));

---------------------------------------------------------------------------------------------
-- low_stock_alerts: an outbox. take_capsule() queues a row when a pour leaves a capsule
-- running low (and again when it empties it); the Worker (worker/low-stock.ts) claims and
-- emails them. RLS on with no policies: only the service role touches it.

CREATE TABLE low_stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capsule_id TEXT NOT NULL REFERENCES capsules(id) ON DELETE CASCADE,
  -- The take that tripped it. Cascade: undoing that take withdraws the alert.
  activity_id UUID REFERENCES activity(id) ON DELETE CASCADE,
  -- Count right after that take.
  qty INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notified_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_low_stock_alerts_pending ON low_stock_alerts(created_at) WHERE notified_at IS NULL;
CREATE INDEX idx_low_stock_alerts_capsule_id ON low_stock_alerts(capsule_id, created_at DESC);
CREATE INDEX idx_low_stock_alerts_activity_id ON low_stock_alerts(activity_id);

ALTER TABLE low_stock_alerts ENABLE ROW LEVEL SECURITY;
