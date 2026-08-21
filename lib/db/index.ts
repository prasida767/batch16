import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
  sql: ReturnType<typeof postgres> | undefined;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

/**
 * Shared Drizzle client.
 *
 * On Vercel/serverless, each isolate must use a tiny pool (max: 1).
 * Prefer Supabase **Transaction** pooler (port 6543), not Session (5432) —
 * Session mode caps ~15 clients and fills up under concurrent SSR.
 */
export function getDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  if (!globalForDb.sql) {
    // Transaction pooler (6543): connection-startup `statement_timeout` is ignored.
    // Default max_pipeline (100) can wedge Supavisor when several queries are
    // written before any response (Promise.all on max:1) — porsager/postgres#970.
    // Use 1 (not 0): 0 skips `onexecute`, which breaks drizzle `db.transaction`
    // with "Cannot set properties of undefined (setting 'onclose')".
    globalForDb.sql = postgres(connectionString, {
      prepare: false, // required for PgBouncer / Supavisor transaction mode
      max: 1, // one connection per serverless isolate
      // @ts-expect-error max_pipeline exists in postgres@3.4 but is missing from types
      max_pipeline: 1,
      idle_timeout: 20,
      max_lifetime: 60 * 5,
      connect_timeout: 5,
      // Only applies on session/direct connections; harmless if ignored on :6543.
      connection: {
        options: "-c statement_timeout=5000",
      },
    });
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.sql, { schema });
  }

  return globalForDb.db;
}

export * from "./schema";
