#!/usr/bin/env node
/**
 * Drop `notifications` from supabase_realtime publication.
 * Notifications use HTTP polling instead of postgres_changes (free-tier friendly).
 */
const postgres = require("postgres");
require("dotenv").config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set in .env.local");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  connect_timeout: 20,
});

async function main() {
  await sql.unsafe(`
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE notifications;
EXCEPTION
  WHEN undefined_object THEN null;
  WHEN undefined_table THEN null;
  WHEN SQLSTATE '42704' THEN null;
END $$;
`);
  console.log("notifications removed from supabase_realtime (or already absent).");
  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  try {
    await sql.end({ timeout: 2 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
