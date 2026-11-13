---------------------------------------------------------------------------------------------
-- Live counts: several guests pour from the same bar at once, so every open phone refreshes
-- on any stock, activity or settings change (src/hooks/use-bar-realtime.ts). Realtime applies
-- the same RLS select policies, so non-members receive nothing.

ALTER PUBLICATION supabase_realtime ADD TABLE stock, activity, settings;
