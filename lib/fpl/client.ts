import "server-only";

import { FPL_BASE_URL } from "./config";
import { FplApiError } from "./errors";

export interface FplRequestOptions {
  /** Next.js fetch revalidate window in seconds. */
  revalidate?: number;
  tags?: string[];
}

/**
 * FPL (Cloudflare) 403s datacenter clients that look like bots.
 * Identify as a browser; never send a custom crawler User-Agent.
 */
const BROWSER_HEADERS: HeadersInit = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-GB,en;q=0.9",
  Origin: "https://fantasy.premierleague.com",
  Referer: "https://fantasy.premierleague.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

const MOBILE_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Accept-Language": "en-GB,en;q=0.9",
  "User-Agent":
    "Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Build/TQ3A.230901.001)",
};

async function requestOnce(url: string, headers: HeadersInit): Promise<Response> {
  return fetch(url, {
    headers,
    // Never let Next cache a 403 — only successful JSON is cached upstream.
    cache: "no-store",
  });
}

export async function fplFetch<T>(
  path: string,
  _options: FplRequestOptions = {},
): Promise<T> {
  const url = `${FPL_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  let response: Response;
  try {
    response = await requestOnce(url, BROWSER_HEADERS);
    if (response.status === 403) {
      response = await requestOnce(url, MOBILE_HEADERS);
    }
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
