import type { FplLiveEvent, FplPick } from "@/lib/fpl";

/** Live GW points from current picks, live stats, and captain/vice fallback. */
export function computeLiveGwPoints(
  picks: FplPick[],
  live: FplLiveEvent,
  chip: string | null,
): number {
  const statsById = new Map(live.elements.map((el) => [el.id, el.stats]));
  const captain = picks.find((pick) => pick.is_captain);
  const vice = picks.find((pick) => pick.is_vice_captain);
  const captainMins = captain
    ? (statsById.get(captain.element)?.minutes ?? 0)
    : 0;
  const viceMins = vice ? (statsById.get(vice.element)?.minutes ?? 0) : 0;
  const captainOff = captainMins === 0 && viceMins > 0;

  let total = 0;
  for (const pick of picks) {
    const stats = statsById.get(pick.element);
    if (!stats) continue;

    let multiplier = pick.multiplier;
    if (captainOff && captain && pick.element === captain.element) {
      multiplier = 0;
    }
    if (captainOff && vice && pick.element === vice.element) {
      multiplier = Math.max(pick.multiplier, chip === "3xc" ? 3 : 2);
    }

    total += stats.total_points * multiplier;
  }

  return total;
}

export function livePointsForElement(
  elementId: number,
  live: FplLiveEvent | null,
  fallback: number,
): { points: number; minutes: number } {
  const stats = live?.elements.find((el) => el.id === elementId)?.stats;
  if (!stats) return { points: fallback, minutes: 0 };
  return { points: stats.total_points, minutes: stats.minutes };
}
