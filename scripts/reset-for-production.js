#!/usr/bin/env node
/**
 * Wipe runtime / test data for a clean production start.
 *
 * KEEPS:
 *   - prize_config
 *   - seasons / weekly_winners / season_prizes (Past Seasons Excel import)
 *   - managers rows (needed for historical FKs + FPL roster)
 *   - activity_prize_display setting (if present)
 *
 * CLEARS:
 *   - auth users, manager_accounts (verification)
 *   - challenges, chat, wall, notifications, awards, documentary, penalties
 *   - activity events + activity points
 *   - weekly_results (current-season admin winners)
 *   - balances (reset to unpaid / 0)
 *   - claim avatars on managers
 *   - runtime settings (e.g. chat active GW)
 *
 * Usage: node scripts/reset-for-production.js
 * Requires DATABASE_URL in .env.local
 */
const path = require("node:path");
const postgres = require("postgres");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL missing — copy .env.example to .env.local");
    process.exit(1);
  }

  const sql = postgres(url, { prepare: false, max: 1 });

  const before = {};
  async function count(label, query) {
    const [row] = await query;
    before[label] = Number(row?.n ?? 0);
  }

  try {
    await count(
      "auth.users",
      sql`select count(*)::int as n from auth.users`,
    );
  } catch {
    before["auth.users"] = "(no access)";
  }

  await count(
    "manager_accounts",
    sql`select count(*)::int as n from manager_accounts`,
  );
  await count("challenges", sql`select count(*)::int as n from challenges`);
  await count(
    "chat_messages",
    sql`select count(*)::int as n from chat_messages`,
  );
  await count(
    "notifications",
    sql`select count(*)::int as n from notifications`,
  );
  await count(
    "activity_events",
    sql`select count(*)::int as n from activity_events`,
  );
  await count(
    "weekly_results",
    sql`select count(*)::int as n from weekly_results`,
  );
  await count(
    "documentary_episodes",
    sql`select count(*)::int as n from documentary_episodes`,
  );
  await count(
    "seasons (kept)",
    sql`select count(*)::int as n from seasons`,
  );

  console.log("Before wipe:", before);

  await sql.begin(async (tx) => {
    // Child / dependent tables first where needed
    await tx`delete from documentary_ratings`;
    await tx`delete from documentary_episodes`;
    await tx`delete from chat_reactions`;
    await tx`delete from chat_messages`;
    await tx`delete from wall_posts`;
    await tx`delete from notifications`;
    await tx`delete from weekly_awards`;
    await tx`delete from challenges`;
    await tx`delete from penalty_matches`;
    await tx`delete from activity_events`;
    await tx`delete from weekly_results`;
    await tx`delete from manager_accounts`;

    // Runtime settings only — keep activity prize display config
    await tx`
      delete from settings
      where key not in ('activity_prize_display')
    `;

    await tx`
      update managers set
        activity_points = 0,
        avatar_url = null,
        supported_team_id = null,
        supported_team_code = null,
        avatar_variant = 0
    `;

    await tx`
      update balances set
        current_balance = '0.00',
        entry_fee_paid = false,
        updated_at = now()
    `;

    // Auth users (Supabase) — cascades sessions / identities
    try {
      await tx`delete from auth.users`;
    } catch (err) {
      console.warn(
        "Could not delete auth.users (permissions). Delete users in Supabase Dashboard → Authentication if needed.",
        err instanceof Error ? err.message : err,
      );
    }
  });

  const after = {
    manager_accounts: (
      await sql`select count(*)::int as n from manager_accounts`
    )[0].n,
    challenges: (await sql`select count(*)::int as n from challenges`)[0].n,
    chat_messages: (await sql`select count(*)::int as n from chat_messages`)[0]
      .n,
    notifications: (await sql`select count(*)::int as n from notifications`)[0]
      .n,
    activity_events: (
      await sql`select count(*)::int as n from activity_events`
    )[0].n,
    weekly_results: (await sql`select count(*)::int as n from weekly_results`)[0]
      .n,
    documentary_episodes: (
      await sql`select count(*)::int as n from documentary_episodes`
    )[0].n,
    seasons: (await sql`select count(*)::int as n from seasons`)[0].n,
    weekly_winners: (
      await sql`select count(*)::int as n from weekly_winners`
    )[0].n,
    season_prizes: (await sql`select count(*)::int as n from season_prizes`)[0]
      .n,
    prize_config: (await sql`select count(*)::int as n from prize_config`)[0].n,
    managers: (await sql`select count(*)::int as n from managers`)[0].n,
  };

  try {
    after["auth.users"] = (
      await sql`select count(*)::int as n from auth.users`
    )[0].n;
  } catch {
    after["auth.users"] = "(check dashboard)";
  }

  console.log("After wipe:", after);
  console.log(
    "\nKept Past Seasons + prize_config + manager roster (all Unverified).",
  );
  console.log("Production reset complete.");

  await sql.end({ timeout: 5 });
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
