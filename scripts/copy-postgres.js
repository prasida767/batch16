#!/usr/bin/env node
/**
 * Copy public schema data from SOURCE_DATABASE_URL → DATABASE_URL.
 * 1. Create a Railway (or other) Postgres and set DATABASE_URL to it.
 * 2. Keep the old Supabase URI in SOURCE_DATABASE_URL.
 * 3. npm run db:push   (create tables on the new DB)
 * 4. npm run db:copy-from-source
 */
const postgres = require("postgres");
require("dotenv").config({ path: ".env.local" });

const sourceUrl = process.env.SOURCE_DATABASE_URL;
const destUrl = process.env.DATABASE_URL;

if (!sourceUrl || !destUrl) {
  console.error(
    "Set SOURCE_DATABASE_URL (old Supabase) and DATABASE_URL (new Postgres) in .env.local",
  );
  process.exit(1);
}

if (sourceUrl === destUrl) {
  console.error("SOURCE_DATABASE_URL and DATABASE_URL must be different.");
  process.exit(1);
}

function client(url) {
  return postgres(url, {
    prepare: false,
    max: 1,
    ssl: "require",
    connect_timeout: 20,
  });
}

async function listTables(sql) {
  const rows = await sql`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_type = 'BASE TABLE'
    order by table_name
  `;
  return rows.map((r) => r.table_name);
}

async function main() {
  const source = client(sourceUrl);
  const dest = client(destUrl);
  try {
    const srcTables = await listTables(source);
    const destTables = new Set(await listTables(dest));
    const tables = srcTables.filter((t) => destTables.has(t));
    const missing = srcTables.filter((t) => !destTables.has(t));
    if (missing.length) {
      console.warn(
        "Skip tables missing on destination (run npm run db:push first):",
        missing.join(", "),
      );
    }
    if (tables.length === 0) {
      throw new Error("No overlapping public tables. Run npm run db:push on the new database first.");
    }

    await dest.unsafe("set session_replication_role = replica");
    for (const table of tables) {
      const ident = dest(table);
      await dest.unsafe(`truncate table ${quoteIdent(table)} cascade`);
      const rows = await source.unsafe(`select * from ${quoteIdent(table)}`);
      if (rows.length === 0) {
        console.log(`  ${table}: 0 rows`);
        continue;
      }
      const columns = Object.keys(rows[0]);
      await dest`insert into ${ident} ${dest(rows, ...columns)}`;
      console.log(`  ${table}: ${rows.length} rows`);
    }

    const sequences = await dest`
      select schemaname, sequencename
      from pg_sequences
      where schemaname = 'public'
    `;
    for (const seq of sequences) {
      const name = `${seq.schemaname}.${seq.sequencename}`;
      // Best-effort: sequences named <table>_<col>_seq
      const match = String(seq.sequencename).match(/^(.*)_([^_]+)_seq$/);
      if (!match) continue;
      const table = match[1];
      const col = match[2];
      if (!destTables.has(table)) continue;
      try {
        await dest.unsafe(
          `select setval(${literal(name)}, coalesce((select max(${quoteIdent(col)}) from ${quoteIdent(table)}), 1))`,
        );
      } catch {
        // ignore tables without that column
      }
    }

    await dest.unsafe("set session_replication_role = origin");
    console.log("Copy complete.");
  } finally {
    await source.end({ timeout: 2 });
    await dest.end({ timeout: 2 });
  }
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function literal(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
