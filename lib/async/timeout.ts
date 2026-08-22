/**
 * Resolve with `fallback` if `promise` takes longer than `ms`.
 * The underlying work is not cancelled; this only unblocks the caller.
 */
export async function raceTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label?: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      console.error(
        `[batch16:timeout] ${label ?? "operation"} exceeded ${ms}ms`,
      );
      resolve(fallback);
    }, ms);
  });
  try {
    return await Promise.race([
      promise.then(
        (value) => value,
        (error) => {
          console.error(
            `[batch16:timeout] ${label ?? "operation"} failed`,
            error,
          );
          return fallback;
        },
      ),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
