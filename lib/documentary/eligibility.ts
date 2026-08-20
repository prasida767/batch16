import type { WeeklyGameweek } from "@/lib/league/types";

/**
 * Only publish a documentary after the GW is finished
 * and someone actually scored (never 0–0 preseason / unplayed weeks).
 */
export function isDocumentaryWeekEligible(
  week: Pick<WeeklyGameweek, "finished" | "rows">,
): boolean {
  if (!week.finished) return false;
  const maxPoints = week.rows.reduce(
    (max, row) => Math.max(max, row.points),
    0,
  );
  return maxPoints > 0;
}
