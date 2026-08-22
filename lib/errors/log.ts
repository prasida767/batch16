/**
 * Consistent client/server error logging. Keep payloads JSON-serializable
 * so Vercel/runtime logs stay searchable by `[batch16:scope]`.
 */
export function logAppError(
  scope: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const digest =
    error && typeof error === "object" && "digest" in error
      ? String((error as { digest?: unknown }).digest ?? "")
      : "";

  console.error(`[batch16:${scope}] ${err.message}`, {
    name: err.name,
    digest: digest || undefined,
    stack: err.stack,
    ...extra,
  });
}

/** Next.js `redirect()` throws; rethrow it from try/catch in server actions. */
export function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

/**
 * Next.js control-flow errors must propagate. Catching them during
 * `next build` makes prerender hang until the 60s static-page timeout.
 */
export function isNextControlFlowError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) {
    return false;
  }
  const digest = String((error as { digest?: unknown }).digest ?? "");
  return (
    digest === "DYNAMIC_SERVER_USAGE" ||
    digest.startsWith("NEXT_REDIRECT") ||
    digest.startsWith("NEXT_NOT_FOUND") ||
    digest.startsWith("NEXT_HTTP_ERROR_FALLBACK")
  );
}

/** Parse JSON from a fetch Response without throwing on HTML error pages. */
export async function readResponseJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    logAppError("http", error, {
      url: response.url,
      status: response.status,
    });
    return null;
  }
}
