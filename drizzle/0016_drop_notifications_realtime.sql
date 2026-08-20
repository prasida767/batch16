-- Free-tier hygiene: drop notifications from Realtime publication.
-- Clients poll /api/notifications instead of postgres_changes (WAL).
-- Broadcast/Presence for Dressing Room + Penalties are unchanged.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
EXCEPTION
  WHEN undefined_object THEN null;
  WHEN undefined_table THEN null;
  WHEN SQLSTATE '42704' THEN null; -- undefined_object alternate
END $$;
