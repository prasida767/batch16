/** Client-safe recap identity helpers (no next/headers). */

export const RECAP_COOKIE_PREFIX = "batch16_recap_seen_";

export function recapCookieName(seasonLabel: string) {
  return `${RECAP_COOKIE_PREFIX}${seasonLabel.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function recapLocalStorageKey(seasonLabel: string, managerId: number) {
  return `batch16_recap_seen:${managerId}:${seasonLabel}`;
}
