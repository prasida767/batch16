import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

/**
 * Supavisor transaction mode drops pipelined query responses.
 * Layout + page often query at the same time on max: 1 — queue so only one
 * query is in flight. Do not add a short timeout here (that caused false
 * Unverified states).
 */
export function serializePostgresClient(sql: Sql): Sql {
  let chain: Promise<unknown> = Promise.resolve();

  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const run = chain.then(work, work);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
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
      ) => enqueue(() => origThen()).then(onFulfilled, onRejected),
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
    enqueue(
      () =>
        (originalBegin as (...a: Parameters<Sql["begin"]>) => Promise<unknown>)(
          ...args,
        ),
    )) as Sql["begin"];

  return sql;
}
