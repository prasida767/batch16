import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { serializePostgresClient } from "./serialize";

type Db = ReturnType<typeof drizzle<typeof schema>>;
type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  db: Db | undefined;
  sql: Sql | undefined;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

function createSql(connectionString: string): Sql {
  // Transaction pooler (:6543) is required on Vercel. Session/direct (:5432)
  // exhausts the ~15-slot free-tier cap under concurrent SSR.
  const sql = postgres(connectionString, {
    prepare: false, // PgBouncer / Supavisor transaction mode
    max: 1, // one backend per serverless isolate
    fetch_types: false, // skip type catalog round-trip on connect
    idle_timeout: 10,
    max_lifetime: 60 * 2,
    connect_timeout: 8,
    ssl: "require",
    // Session GUCs are ignored on :6543; harmless on session/direct.
    connection: {
      application_name: "batch16",
      options: "-c statement_timeout=8000",
    },
  });

  return serializePostgresClient(sql, () => {
    void resetDbClient();
  });
}

/**
 * Shared Drizzle client. Queries on this isolate are serialized so Promise.all
 * cannot pipeline through Supavisor (that hang is what made tiny SELECTs run
 * for minutes).
 */
export function getDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  }

  if (!globalForDb.sql) {
    globalForDb.sql = createSql(connectionString);
  }
  if (!globalForDb.db) {
    globalForDb.db = drizzle(globalForDb.sql, { schema });
  }

  return globalForDb.db;
}

/**
 * Drop the cached postgres.js client. Call after a timed-out query so the next
 * request does not reuse a wedged single connection (max: 1).
 */
export async function resetDbClient(): Promise<void> {
  const sql = globalForDb.sql;
  globalForDb.sql = undefined;
  globalForDb.db = undefined;
  if (!sql) return;
  try {
    await sql.end({ timeout: 1 });
  } catch {
    // Connection may already be dead.
  }
}

export * from "./schema";
