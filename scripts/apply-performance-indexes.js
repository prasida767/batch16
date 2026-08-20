#!/usr/bin/env node
/**
 * Apply performance indexes from drizzle/0015_performance_indexes.sql.
 * Useful when drizzle-kit migrate hangs on partially-pushed databases.
 */
const fs = require("fs");
const path = require("path");
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
  const file = path.join(
    __dirname,
    "..",
    "drizzle",
    "0015_performance_indexes.sql",
  );
  const raw = fs.readFileSync(file, "utf8");
  const statements = raw
    .split("--> statement-breakpoint")
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim(),
    )
    .filter(Boolean);

  console.log(`Applying ${statements.length} index statements…`);
  for (const statement of statements) {
    const nameMatch = statement.match(/"([^"]+_idx)"/);
    const label = nameMatch?.[1] ?? statement.slice(0, 48);
    process.stdout.write(`  ${label}… `);
    await sql.unsafe(statement);
    console.log("ok");
  }
  console.log("Done.");
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
