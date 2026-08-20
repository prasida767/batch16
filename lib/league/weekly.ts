import type { FplBootstrapStatic, FplLeagueStandingRow } from "@/lib/fpl";
import type { StoredWeeklyResult } from "@/lib/league/db";
import type { WeeklyGameweek, WeeklyManagerScore } from "@/lib/league/types";
import {
  canAutoDeclareWinners,
  isFplGameweekSettled,
} from "@/lib/league/winners";

type HistoryLike = {
  current: Array<{ event: number; points: number }>;
};

/** Build per-GW scores from FPL histories, then overlay any DB-marked winners. */
export function buildWeeklyGameweeks(
  results: FplLeagueStandingRow[],
  bootstrap: FplBootstrapStatic,
  histories: Map<number, HistoryLike>,
  dbWeekly: StoredWeeklyResult[] = [],
): WeeklyGameweek[] {
  const nameByEntry = new Map(
    results.map((row) => [row.entry, row.player_name]),
  );
  const teamByEntry = new Map(
    results.map((row) => [row.entry, row.entry_name]),
  );
  const eventIds = new Set<number>();
  for (const history of histories.values()) {
    for (const row of history.current) eventIds.add(row.event);
  }
  for (const row of dbWeekly) eventIds.add(row.gameweek);

  const dbByGw = new Map<number, StoredWeeklyResult[]>();
  for (const row of dbWeekly) {
    const list = dbByGw.get(row.gameweek) ?? [];
    list.push(row);
    dbByGw.set(row.gameweek, list);
  }

  const weeks = [...eventIds].sort((a, b) => a - b);
  return weeks.map((gameweek) => {
    const event = bootstrap.events.find((item) => item.id === gameweek);
    const scores: WeeklyManagerScore[] = results
      .map((row) => {
        const gw = histories
          .get(row.entry)
          ?.current.find((item) => item.event === gameweek);
        const stored = dbByGw
          .get(gameweek)
          ?.find((item) => item.fplEntryId === row.entry);
        return {
          entryId: row.entry,
          name: nameByEntry.get(row.entry) ?? row.player_name,
          teamName: teamByEntry.get(row.entry) ?? row.entry_name,
          points: stored?.points ?? gw?.points ?? 0,
          rank: 0,
          isWinner: false,
        };
      })
      .sort((a, b) => b.points - a.points);

    scores.forEach((row, index) => {
      row.rank = index + 1;
    });

    const dbRows = dbByGw.get(gameweek);
    const hasDbOverride = Boolean(dbRows && dbRows.length > 0);
    const fplSettled = isFplGameweekSettled(event);

    let winners: WeeklyManagerScore[];
    if (hasDbOverride) {
      // Admin confirmation: only rows flagged is_winner count as declared.
      const winnerIds = new Set(
        dbRows!
          .filter((row) => row.isWinner && row.fplEntryId != null)
          .map((row) => row.fplEntryId as number),
      );
      for (const score of scores) {
        score.isWinner = winnerIds.has(score.entryId);
      }
      winners = scores.filter((row) => row.isWinner);
    } else if (
      canAutoDeclareWinners({
        event,
        scores,
        rosterSize: results.length,
        historiesLoaded: histories.size,
      })
    ) {
      const winnerPoints = scores[0]?.points ?? 0;
      winners =
        winnerPoints > 0
          ? scores.filter((row) => row.points === winnerPoints)
          : [];
      for (const winner of winners) winner.isWinner = true;
    } else {
      winners = [];
    }

    // Finished for payouts / celebration / documentary:
    // FPL settled, or admin explicitly declared at least one winner.
    const finished =
      fplSettled || (hasDbOverride && winners.length > 0);

    return {
      gameweek,
      finished,
      isCurrent: Boolean(event?.is_current),
      winnerNames: winners.map((row) => row.name),
      winnerEntryIds: winners.map((row) => row.entryId),
      winnerPoints: winners[0]?.points ?? 0,
      rows: scores,
      manuallySet: hasDbOverride,
    };
  });
}
