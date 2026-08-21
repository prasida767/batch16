import "server-only";

import https from "node:https";
import { getFplBaseUrl } from "./config";
import { FplApiError } from "./errors";

export interface FplRequestOptions {
  /** Kept for callers; caching is handled by unstable_cache, not fetch. */
  revalidate?: number;
  tags?: string[];
}

const CHROME_HEADERS: Record<string, string> = {
  Accept: "application/json,text/plain,*/*",
  "Accept-Language": "en-GB,en;q=0.9",
  Connection: "close",
  Referer: "https://fantasy.premierleague.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

/** FPL's Android client is often allowed when browser TLS from AWS is not. */
const DALVIK_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Accept-Language": "en-GB,en;q=0.9",
  Connection: "close",
  "User-Agent":
    "Dalvik/2.1.0 (Linux; U; Android 13; Pixel 7 Build/TQ3A.230901.001)",
};

type HttpResult = { status: number; body: string };

function httpsGet(
  url: string,
  headers: Record<string, string>,
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: "GET",
        headers,
        family: 4,
        timeout: 8_000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => chunks.push(chunk as Buffer));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timed out"));
    });
    req.on("error", reject);
    req.end();
  });
}

export async function fplFetch<T>(
  path: string,
  _options: FplRequestOptions = {},
): Promise<T> {
  const base = getFplBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  let result: HttpResult;
  try {
    result = await httpsGet(url, CHROME_HEADERS);
    if (result.status === 403) {
      result = await httpsGet(url, DALVIK_HEADERS);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Network error";
    console.error("[fpl] Request failed", { url, reason });
    throw new FplApiError(`FPL request failed: ${reason}`, 0, path);
  }

  if (result.status < 200 || result.status >= 300) {
    console.error("[fpl] Non-OK response", {
      url,
      status: result.status,
      body: result.body.slice(0, 200),
    });
    throw new FplApiError(
      `FPL ${path} returned ${result.status}`,
      result.status,
      path,
    );
  }

  try {
    return JSON.parse(result.body) as T;
  } catch {
    throw new FplApiError(
      `FPL ${path} returned invalid JSON`,
      result.status,
      path,
    );
  }
}
