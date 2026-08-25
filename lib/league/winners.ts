/**
 * Pure helpers for when a gameweek may declare winners.
 * Auto-winners require FPL to finish and data-check the event.
 * Admin confirmation can declare winners earlier via weekly_results.
 */

export type FplEventLike = {
  finished: boolean;
  data_checked: boolean;
};

/** Postgres/Drizzle may return boolean, 1/0, or 't'/'f' depending on the driver. */
export function isDbTrue(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "t" || value === "true";
}

export type WinnerRowLike = {
  gameweek: number;
  isWinner: unknown;
  points: number;
  entryId: number | null;
  name: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number | null;
};

export type GwWinnerView = {
  gameweek: number;
  winnerPoints: number;
  celebrationKey: string;
  winners: Array<{
    entryId: number | null;
    name: string;
    avatarUrl: string | null;
    supportedTeamId: number | null;
    supportedTeamCode: number | null;
    avatarVariant: number;
  }>;
};

/** Latest gameweek that has at least one flagged winner. */
export function celebrationFromWinnerRows(rows: WinnerRowLike[]): GwWinnerView | null {
  const winners = rows.filter((row) => isDbTrue(row.isWinner));
  if (winners.length === 0) return null;

  const gameweek = Math.max(...winners.map((row) => row.gameweek));
  const forGw = winners.filter((row) => row.gameweek === gameweek);
  if (forGw.length === 0) return null;

  const people = forGw.map((row) => ({
    entryId: row.entryId,
    name: row.name,
    avatarUrl: row.avatarUrl,
    supportedTeamId: row.supportedTeamId,
    supportedTeamCode: row.supportedTeamCode,
    avatarVariant: row.avatarVariant ?? 0,
  }));

  return {
    gameweek,
    winnerPoints: forGw[0]?.points ?? 0,
    celebrationKey: `gw-winner-${gameweek}-${people
      .map((person) => person.entryId ?? person.name)
      .join("-")}`,
    winners: people,
  };
}

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
