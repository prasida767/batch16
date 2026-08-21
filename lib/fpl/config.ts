export const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

/** Cache lifetimes in seconds. Tune per endpoint — live data stays short. */
export const FPL_CACHE = {
  bootstrap: 300,
  league: 60,
  entry: 120,
  history: 120,
  picks: 60,
  live: 30,
  fixtures: 120,
} as const;

export const FPL_CACHE_TAGS = {
  all: "fpl",
  bootstrap: "fpl:bootstrap",
  league: (leagueId: number) => `fpl:league:${leagueId}`,
  entry: (entryId: number) => `fpl:entry:${entryId}`,
  history: (entryId: number) => `fpl:history:${entryId}`,
  picks: (entryId: number, eventId: number) =>
    `fpl:picks:${entryId}:${eventId}`,
  live: (eventId: number) => `fpl:live:${eventId}`,
  fixtures: "fpl:fixtures",
  fixturesEvent: (eventId: number) => `fpl:fixtures:${eventId}`,
} as const;

/** Classic league ID from `FPL_LEAGUE_ID`, or `null` if unset/invalid. */
export function getLeagueId(): number | null {
  const raw = process.env.FPL_LEAGUE_ID?.trim();
  if (!raw) return null;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return id;
}

/** Same as `getLeagueId`, but throws a clear error when missing. */
export function requireLeagueId(): number {
  const id = getLeagueId();
  if (id == null) {
    throw new Error(
      "FPL_LEAGUE_ID is not set. Add your classic league ID to .env.local.",
    );
  }
  return id;
}
