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
    globalForDb.sql = postgres(connectionString, {
      prepare: false, // required for PgBouncer transaction mode
      max: 1, // one connection per serverless isolate
      idle_timeout: 20,
      max_lifetime: 60 * 5,
      connect_timeout: 10,
    });
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.sql, { schema });
  }

  return globalForDb.db;
}

export * from "./schema";
