import "server-only";

import { FPL_BASE_URL, FPL_CACHE_TAGS } from "./config";
import { FplApiError } from "./errors";

export interface FplRequestOptions {
  /** Next.js fetch revalidate window in seconds. */
  revalidate?: number;
  tags?: string[];
}

export async function fplFetch<T>(
  path: string,
  options: FplRequestOptions = {},
): Promise<T> {
  const url = `${FPL_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const tags = [FPL_CACHE_TAGS.all, ...(options.tags ?? [])];

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "fpl-league/0.1 (private league tracker)",
      },
      signal: AbortSignal.timeout(12_000),
      next: {
        revalidate: options.revalidate ?? 60,
        tags,
      },
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network error";
    console.error("[fpl] Request failed", { url, reason });
    throw new FplApiError(`FPL request failed: ${reason}`, 0, path);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[fpl] Non-OK response", {
      url,
      status: response.status,
      body: body.slice(0, 200),
    });
    throw new FplApiError(
      `FPL ${path} returned ${response.status}`,
      response.status,
      path,
    );
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new FplApiError(`FPL ${path} returned invalid JSON`, response.status, path);
  }
}
