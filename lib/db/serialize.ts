import type postgres from "postgres";
import { withTimeout } from "@/lib/async/timeout";

type Sql = ReturnType<typeof postgres>;

const QUERY_TIMEOUT_MS = 8_000;

/**
 * Supavisor transaction mode drops pipelined query responses (postgres.js#970).
 * Drizzle + Promise.all calls `.then` on several queries at once, which pipelines
 * them on a single connection. Queue so only one query is in flight.
 *
 * Transactions (`sql.begin`) take the lock for the whole BEGIN…COMMIT so
 * `onexecute` still runs (unlike `max_pipeline: 0`).
 */
export function serializePostgresClient(
  sql: Sql,
  onTimeout: () => void,
): Sql {
  let chain: Promise<unknown> = Promise.resolve();

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = chain.then(work, work);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  function runQuery<T>(start: () => Promise<T>): Promise<T> {
    return enqueue(async () => {
      try {
        return await withTimeout(start(), QUERY_TIMEOUT_MS, "db-query");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.includes("timed out")) {
          onTimeout();
        }
        throw error;
      }
    });
  }

  function wrapQuery<T extends { then: typeof Promise.prototype.then }>(
    query: T,
  ): T {
    const origThen = query.then.bind(query) as (
      ...args: Parameters<typeof Promise.prototype.then>
    ) => Promise<unknown>;

    Object.defineProperty(query, "then", {
      configurable: true,
      value: (
        onFulfilled?: ((value: unknown) => unknown) | null,
        onRejected?: ((reason: unknown) => unknown) | null,
      ) => runQuery(() => origThen()).then(onFulfilled, onRejected),
    });

    const values = (query as { values?: (...args: unknown[]) => T }).values;
    if (typeof values === "function") {
      Object.defineProperty(query, "values", {
        configurable: true,
        value: (...args: unknown[]) => wrapQuery(values.apply(query, args)),
      });
    }

    return query;
  }

  const originalUnsafe = sql.unsafe.bind(sql);
  sql.unsafe = ((...args: Parameters<Sql["unsafe"]>) =>
    wrapQuery(originalUnsafe(...args))) as Sql["unsafe"];

  const originalBegin = sql.begin.bind(sql);
  (sql as { begin: Sql["begin"] }).begin = ((
    ...args: Parameters<Sql["begin"]>
  ) =>
    runQuery(
      () =>
        (originalBegin as (...a: Parameters<Sql["begin"]>) => Promise<unknown>)(
          ...args,
        ),
    )) as Sql["begin"];

  return sql;
}
