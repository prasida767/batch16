import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured, managers, weeklyResults } from "@/lib/db";
import { leagueRosterRows } from "@/lib/fpl";
import { getLeagueBoard, getLeagueSnapshot } from "@/lib/league/queries";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";
import { isFplGameweekSettled } from "@/lib/league/winners";

let persistInFlight: Promise<void> | null = null;

/**
 * After FPL finishes and data-checks a GW, write weekly_results so the
 * winner banner can show without an admin save. No-op if that GW is stored.
 */
export async function ensureSettledWinnersPersisted(): Promise<void> {
  if (!isDatabaseConfigured()) return;
  if (persistInFlight) {
    await persistInFlight;
    return;
  }
  persistInFlight = persistSettledWinners().finally(() => {
    persistInFlight = null;
  });
  await persistInFlight;
}

async function persistSettledWinners(): Promise<void> {
  const board = await getLeagueBoard();
  if (board.kind !== "ok") return;

  const settled = [...board.data.bootstrap.events]
    .filter((event) => isFplGameweekSettled(event))
    .sort((a, b) => b.id - a.id)[0];
  if (!settled) return;

  const stored = board.data.db.weekly.filter(
    (row) => row.gameweek === settled.id,
  );
  if (stored.some((row) => row.isWinner)) return;

  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") return;

  const weeks = buildWeeklyGameweeks(
    leagueRosterRows(snapshot.data.standings),
    snapshot.data.bootstrap,
    snapshot.data.histories,
    snapshot.data.db.weekly,
  );
  const week = weeks.find((row) => row.gameweek === settled.id);
  if (!week || week.winnerEntryIds.length === 0) return;

  const winnerIds = new Set(week.winnerEntryIds);
  const db = getDb();
  const dbManagers = await db
    .select({
      id: managers.id,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers);

  const byEntry = new Map(
    dbManagers
      .filter(
        (row): row is { id: number; fplEntryId: number } =>
          row.fplEntryId != null,
      )
      .map((row) => [row.fplEntryId, row.id]),
  );

  for (const row of week.rows) {
    const managerId = byEntry.get(row.entryId);
    if (managerId == null) continue;

    const values = {
      gameweek: week.gameweek,
      managerId,
      points: row.points,
      rank: row.rank,
      isWinner: winnerIds.has(row.entryId),
    };

    const [already] = await db
      .select({ id: weeklyResults.id })
      .from(weeklyResults)
      .where(
        and(
          eq(weeklyResults.gameweek, week.gameweek),
          eq(weeklyResults.managerId, managerId),
        ),
      )
      .limit(1);

    if (already) {
      await db
        .update(weeklyResults)
        .set({
          points: values.points,
          rank: values.rank,
          isWinner: values.isWinner,
        })
        .where(eq(weeklyResults.id, already.id));
    } else {
      await db.insert(weeklyResults).values(values);
    }
  }
}
