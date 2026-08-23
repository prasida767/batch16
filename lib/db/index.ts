import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
  sql: Sql | undefined;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function poolMax() {
  const fromEnv = Number(process.env.DB_POOL_MAX);
  if (Number.isInteger(fromEnv) && fromEnv > 0) {
    return Math.min(fromEnv, 20);
  }
  // One connection per serverless isolate. A long-lived Node process
  // (next dev / next start) serves chat, live, and pages at once — max: 1
  // queues them and a hung poll then times out prize_config / league reads.
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return 1;
  }
  return 8;
}

function isStatementTimeout(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current; i++) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === "57014"
    ) {
      return true;
    }
    current =
      typeof current === "object" && current !== null && "cause" in current
        ? (current as { cause: unknown }).cause
        : null;
  }
  return false;
}

/** Drop a wedged client so the next getDb() opens a fresh pool. */
export function resetDbClient() {
  const sql = globalForDb.sql;
  globalForDb.sql = undefined;
  globalForDb.db = undefined;
  if (!sql) return;
  void sql.end({ timeout: 2 }).catch(() => {
    /* ignore — we already abandoned this pool */
  });
}

/**
 * Shared Drizzle client.
 *
 * Prefer Supabase **Transaction** pooler (port 6543), not Session (5432).
 * Never `db.transaction()` and never `Promise.all` two Drizzle queries —
 * PgBouncer + `max: 1` on Vercel will deadlock waiting on the same client.
 */
export function getDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  if (!globalForDb.sql) {
    const sql = postgres(connectionString, {
      prepare: false, // required for PgBouncer transaction mode
      max: poolMax(),
      idle_timeout: 20,
      max_lifetime: 60 * 5,
      connect_timeout: 4,
      connection: {
        application_name: "batch16",
        statement_timeout: process.env.VERCEL ? 5000 : 8000,
      },
      onclose() {
        // Connection recycling must not become an unhandledRejection overlay.
      },
    });
    // postgres.js can reject a second time after statement timeout; swallow
    // that so Next does not paint a global console error over a recovered page.
    const handle = sql as Sql & {
      on?: (event: string, fn: (err: unknown) => void) => void;
    };
    handle.on?.("error", (err: unknown) => {
      console.error("[db] connection error", err);
      if (isStatementTimeout(err)) resetDbClient();
    });
    globalForDb.sql = sql;
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.sql, { schema });
  }

  return globalForDb.db;
}

export { isStatementTimeout };
export * from "./schema";
