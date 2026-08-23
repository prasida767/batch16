import "server-only";

import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import {
  getDb,
  isDatabaseConfigured,
  managers,
  weeklyResults,
} from "@/lib/db";

export type GwWinnerPerson = {
  entryId: number;
  name: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
};

export type GwWinnerCelebration = {
  gameweek: number;
  winnerPoints: number;
  celebrationKey: string;
  winners: GwWinnerPerson[];
};

/**
 * GW winner overlay from weekly_results only.
 * Must not call getDashboardData() — that rebuilds every FPL history on each tab.
 */
export const getActiveGwWinnerCelebration = cache(
  async (): Promise<GwWinnerCelebration | null> => {
    if (!isDatabaseConfigured()) return null;

    try {
      const db = getDb();
      const [latest] = await db
        .select({ gameweek: weeklyResults.gameweek })
        .from(weeklyResults)
        .where(eq(weeklyResults.isWinner, true))
        .orderBy(desc(weeklyResults.gameweek))
        .limit(1);

      if (!latest) return null;

      // Do not call FPL here — the overlay lives in every signed-in layout
      // and a slow bootstrap 504s Hobby deploys. Hide after the next GW
      // once weekly_results for a later winner exists.

      const winnerRows = await db
        .select({
          entryId: managers.fplEntryId,
          name: managers.displayName,
          avatarUrl: managers.avatarUrl,
          supportedTeamId: managers.supportedTeamId,
          supportedTeamCode: managers.supportedTeamCode,
          avatarVariant: managers.avatarVariant,
          points: weeklyResults.points,
        })
        .from(weeklyResults)
        .innerJoin(managers, eq(managers.id, weeklyResults.managerId))
        .where(
          and(
            eq(weeklyResults.gameweek, latest.gameweek),
            eq(weeklyResults.isWinner, true),
          ),
        );

      const winners: GwWinnerPerson[] = winnerRows.flatMap((row) =>
        row.entryId == null
          ? []
          : [
              {
                entryId: row.entryId,
                name: row.name,
                avatarUrl: row.avatarUrl,
                supportedTeamId: row.supportedTeamId,
                supportedTeamCode: row.supportedTeamCode,
                avatarVariant: row.avatarVariant ?? 0,
              },
            ],
      );
      if (winners.length === 0) return null;

      return {
        gameweek: latest.gameweek,
        winnerPoints: winnerRows[0]?.points ?? 0,
        celebrationKey: `gw-winner-${latest.gameweek}-${winners
          .map((w) => w.entryId)
          .join("-")}`,
        winners,
      };
    } catch (error) {
      unstable_rethrow(error);
      return null;
    }
  },
);
