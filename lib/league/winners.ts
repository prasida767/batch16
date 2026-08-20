/**
 * Pure helpers for when a gameweek may declare winners.
 * Auto-winners require FPL to finish and data-check the event.
 * Admin confirmation can declare winners earlier via weekly_results.
 */

export type FplEventLike = {
  finished: boolean;
  data_checked: boolean;
};

/** True when FPL has finished the GW and bonus/points are settled. */
export function isFplGameweekSettled(
  event: FplEventLike | null | undefined,
): boolean {
  return Boolean(event?.finished && event?.data_checked);
}

/**
 * Auto-declare winners only after FPL settlement and real scores.
 * Missing histories for some managers should not crown someone by default.
 */
export function canAutoDeclareWinners(args: {
  event: FplEventLike | null | undefined;
  scores: Array<{ points: number }>;
  rosterSize: number;
  historiesLoaded: number;
}): boolean {
  if (!isFplGameweekSettled(args.event)) return false;
  if (args.rosterSize === 0) return false;
  // Refuse auto crown if we couldn't load most histories (zeros look like ties).
  if (args.historiesLoaded < Math.ceil(args.rosterSize * 0.5)) return false;
  const maxPoints = args.scores.reduce((m, s) => Math.max(m, s.points), 0);
  return maxPoints > 0;
}
