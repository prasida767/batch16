#!/usr/bin/env node
/**
 * Apply chat + documentary tables when `drizzle-kit migrate` hangs
 * (common when the DB was built with push / partial journals).
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

async function tableExists(name) {
  const rows = await sql`
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = ${name}
    limit 1
  `;
  return rows.length > 0;
}

async function main() {
  console.log("Connecting…");
  await sql`select 1`;

  const before = {
    chat_messages: await tableExists("chat_messages"),
    chat_reactions: await tableExists("chat_reactions"),
    documentary_episodes: await tableExists("documentary_episodes"),
    documentary_ratings: await tableExists("documentary_ratings"),
    notifications: await tableExists("notifications"),
  };
  console.log("Before:", before);

  if (!before.chat_messages) {
    console.log("Creating chat_messages…");
    await sql.unsafe(`
CREATE TABLE chat_messages (
  id serial PRIMARY KEY NOT NULL,
  manager_id integer NOT NULL REFERENCES managers(id) ON DELETE cascade,
  body text NOT NULL,
  reply_to_id integer,
  gameweek integer NOT NULL,
  pinned_at timestamptz,
  pinned_by integer REFERENCES managers(id) ON DELETE set null,
  is_hall_of_fame boolean DEFAULT false NOT NULL,
  is_quote_of_week boolean DEFAULT false NOT NULL,
  reaction_count integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_reply_to_id_chat_messages_id_fk
  FOREIGN KEY (reply_to_id) REFERENCES chat_messages(id) ON DELETE set null;
`);
  }

  if (!before.chat_reactions) {
    console.log("Creating chat_reactions…");
    await sql.unsafe(`
CREATE TABLE chat_reactions (
  id serial PRIMARY KEY NOT NULL,
  message_id integer NOT NULL REFERENCES chat_messages(id) ON DELETE cascade,
  manager_id integer NOT NULL REFERENCES managers(id) ON DELETE cascade,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS chat_reactions_unique_idx
  ON chat_reactions (message_id, manager_id, emoji);
`);
  }

  await sql.unsafe(`
CREATE INDEX IF NOT EXISTS chat_messages_active_gw_idx
  ON chat_messages (gameweek)
  WHERE deleted_at IS NULL AND is_hall_of_fame = false;
CREATE INDEX IF NOT EXISTS chat_messages_hof_idx
  ON chat_messages (gameweek)
  WHERE is_hall_of_fame = true;
`);

  if (!before.documentary_episodes) {
    console.log("Creating documentary_episodes…");
    await sql.unsafe(`
CREATE TABLE documentary_episodes (
  id serial PRIMARY KEY NOT NULL,
  kind text DEFAULT 'weekly' NOT NULL,
  gameweek integer,
  title text NOT NULL,
  biggest_shock text NOT NULL,
  worst_decision text NOT NULL,
  dramatic_overtake text NOT NULL,
  quote_message_id integer REFERENCES chat_messages(id) ON DELETE set null,
  quote_body text,
  quote_manager_name text,
  quote_reaction_count integer DEFAULT 0 NOT NULL,
  cliffhanger text NOT NULL,
  finale_summary text,
  rating_sum integer DEFAULT 0 NOT NULL,
  rating_count integer DEFAULT 0 NOT NULL,
  generated_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS documentary_episodes_weekly_gw_idx
  ON documentary_episodes (gameweek) WHERE kind = 'weekly';
CREATE UNIQUE INDEX IF NOT EXISTS documentary_episodes_finale_idx
  ON documentary_episodes (kind) WHERE kind = 'finale';
`);
  }

  if (!before.documentary_ratings) {
    console.log("Creating documentary_ratings…");
    await sql.unsafe(`
CREATE TABLE documentary_ratings (
  id serial PRIMARY KEY NOT NULL,
  episode_id integer NOT NULL REFERENCES documentary_episodes(id) ON DELETE cascade,
  manager_id integer NOT NULL REFERENCES managers(id) ON DELETE cascade,
  stars integer NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS documentary_ratings_unique_idx
  ON documentary_ratings (episode_id, manager_id);
`);
  }

  if (!before.notifications) {
    console.log("Creating notifications…");
    await sql.unsafe(`
CREATE TABLE notifications (
  id serial PRIMARY KEY NOT NULL,
  recipient_manager_id integer NOT NULL REFERENCES managers(id) ON DELETE cascade,
  actor_manager_id integer REFERENCES managers(id) ON DELETE set null,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  href text,
  meta jsonb DEFAULT '{}'::jsonb NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_recipient_created_idx
  ON notifications (recipient_manager_id, created_at);
CREATE INDEX IF NOT EXISTS notifications_recipient_unread_idx
  ON notifications (recipient_manager_id, read_at);
`);
    try {
      await sql.unsafe(
        `ALTER PUBLICATION supabase_realtime ADD TABLE notifications`,
      );
      console.log("Added notifications to supabase_realtime publication");
    } catch (e) {
      console.log("Realtime publication skipped:", e.message || e);
    }
  }

  const after = {
    chat_messages: await tableExists("chat_messages"),
    chat_reactions: await tableExists("chat_reactions"),
    documentary_episodes: await tableExists("documentary_episodes"),
    documentary_ratings: await tableExists("documentary_ratings"),
    notifications: await tableExists("notifications"),
  };
  console.log("After:", after);
  console.log("Done.");
  await sql.end({ timeout: 5 });
}

main().catch(async (e) => {
  console.error(e);
  try {
    await sql.end({ timeout: 1 });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
