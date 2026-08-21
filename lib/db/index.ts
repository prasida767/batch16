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

function isSupabaseTransactionPooler(connectionString: string): boolean {
  try {
    const url = new URL(connectionString);
    return url.port === "6543" || url.hostname.includes("pooler.supabase.com");
  } catch {
    return false;
  }
}

function createSql(connectionString: string): Sql {
  const pooler = isSupabaseTransactionPooler(connectionString);
  const sql = postgres(connectionString, {
    // Transaction-mode poolers cannot use prepared statements.
    prepare: !pooler,
    max: 1, // one backend per Vercel isolate
    fetch_types: false,
    idle_timeout: 10,
    max_lifetime: 60 * 2,
    connect_timeout: 8,
    ssl: "require",
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
 * cannot pipeline (needed for Supabase poolers; harmless on Railway/direct).
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
