import type { FplLiveEvent, FplPick } from "@/lib/fpl/types";
import { rankDelta } from "@/lib/league/format";
import type { LiveStandingUpdate } from "@/lib/league/types";

export type LiveRaceRow = LiveStandingUpdate & {
  displayRank: number;
  displayGw: number;
  displayTotal: number;
};

function finite(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Live GW points from current picks, live stats, and captain/vice fallback. */
export function computeLiveGwPoints(
  picks: FplPick[] | null | undefined,
  live: FplLiveEvent | null | undefined,
  chip: string | null,
): number {
  const elements = (live?.elements ?? []).filter(
    (el) => el && Number.isFinite(el.id),
  );
  const statsById = new Map(elements.map((el) => [el.id, el.stats]));
  const rows = (picks ?? []).filter(
    (pick) => pick && Number.isFinite(pick.element),
  );
  const captain = rows.find((pick) => pick.is_captain);
  const vice = rows.find((pick) => pick.is_vice_captain);
  const captainMins = captain
    ? finite(statsById.get(captain.element)?.minutes)
    : 0;
  const viceMins = vice ? finite(statsById.get(vice.element)?.minutes) : 0;
  const captainOff = captainMins === 0 && viceMins > 0;

  let total = 0;
  for (const pick of rows) {
    const stats = statsById.get(pick.element);
    if (!stats) continue;

    let multiplier = finite(pick.multiplier);
    if (captainOff && captain && pick.element === captain.element) {
      multiplier = 0;
    }
    if (captainOff && vice && pick.element === vice.element) {
      multiplier = Math.max(finite(pick.multiplier), chip === "3xc" ? 3 : 2);
    }

    total += finite(stats.total_points) * multiplier;
  }

  return Number.isFinite(total) ? total : 0;
}

export function livePointsForElement(
  elementId: number,
  live: FplLiveEvent | null,
  fallback: number,
): { points: number; minutes: number } {
  const stats = live?.elements?.find((el) => el.id === elementId)?.stats;
  if (!stats) return { points: fallback, minutes: 0 };
  return { points: finite(stats.total_points, fallback), minutes: finite(stats.minutes) };
}

export function sanitizeLiveStandings(
  rows: LiveStandingUpdate[] | null | undefined,
): LiveStandingUpdate[] {
  return (rows ?? [])
    .filter((row) => Number.isFinite(row.entryId) && row.entryId > 0)
    .map((row) => ({
      entryId: row.entryId,
      playerName: (row.playerName || "").trim() || `Entry ${row.entryId}`,
      teamName: (row.teamName || "").trim() || "—",
      rank: finite(row.rank),
      lastRank: finite(row.lastRank) || finite(row.rank),
      totalPoints: finite(row.totalPoints),
      eventPoints: finite(row.eventPoints),
      livePoints:
        row.livePoints != null && Number.isFinite(row.livePoints)
          ? row.livePoints
          : null,
    }));
}

export function liveGwPoints(row: LiveStandingUpdate): number {
  return row.livePoints != null ? finite(row.livePoints) : finite(row.eventPoints);
}

/** Official total − official GW + live GW, when live stats exist. */
export function projectedTotal(row: LiveStandingUpdate): number {
  if (row.livePoints != null && Number.isFinite(row.livePoints)) {
    return finite(row.totalPoints) - finite(row.eventPoints) + row.livePoints;
  }
  return finite(row.totalPoints);
}

/** Rank everyone by live projected total (fallback: official total). */
export function rankByLiveProjection(
  standings: LiveStandingUpdate[],
): LiveRaceRow[] {
  return sanitizeLiveStandings(standings)
    .map((row) => ({
      ...row,
      displayGw: liveGwPoints(row),
      displayTotal: projectedTotal(row),
    }))
    .sort(
      (a, b) =>
        b.displayTotal - a.displayTotal ||
        b.displayGw - a.displayGw ||
        a.playerName.localeCompare(b.playerName, undefined, {
          sensitivity: "base",
        }),
    )
    .map((row, index) => ({ ...row, displayRank: index + 1 }));
}

/** Rank everyone by official FPL league rank. */
export function rankByOfficial(standings: LiveStandingUpdate[]): LiveRaceRow[] {
  const cleaned = sanitizeLiveStandings(standings).sort(
    (a, b) =>
      (a.rank > 0 ? a.rank : 9999) - (b.rank > 0 ? b.rank : 9999) ||
      b.totalPoints - a.totalPoints ||
      a.playerName.localeCompare(b.playerName, undefined, {
        sensitivity: "base",
      }),
  );
  const assign = cleaned.every((row) => row.rank <= 0);
  return cleaned.map((row, index) => ({
    ...row,
    displayRank: assign ? index + 1 : row.rank > 0 ? row.rank : index + 1,
    displayGw: liveGwPoints(row),
    displayTotal: finite(row.totalPoints),
  }));
}

/** Pressure / crowd from live rank movement. Never returns NaN. */
export function pressureCrowdMeters(
  rows: { rank: number; lastRank?: number | null }[],
): { pressure: number; crowd: number; rising: number; falling: number } {
  let moveSum = 0;
  let rising = 0;
  let falling = 0;
  for (const row of rows) {
    if (row.lastRank == null) continue;
    const d = rankDelta(row.rank, row.lastRank);
    if (!Number.isFinite(d) || d === 0) continue;
    moveSum += Math.abs(d);
    if (d > 0) rising += 1;
    if (d < 0) falling += 1;
  }
  const n = Math.max(rows.length, 1);
  const pressure = Math.min(100, Math.round((moveSum / n) * 28));
  const crowd = Math.min(100, Math.round(((rising + falling) / n) * 100));
  return {
    pressure: Number.isFinite(pressure) ? pressure : 0,
    crowd: Number.isFinite(crowd) ? crowd : 0,
    rising,
    falling,
  };
}
