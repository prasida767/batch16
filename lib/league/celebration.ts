import "server-only";

import { cache } from "react";
import { and, desc, eq } from "drizzle-orm";
import { getBootstrapStatic } from "@/lib/fpl";
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
  /** Stable key for one-shot overlay per browser session. */
  celebrationKey: string;
  winners: GwWinnerPerson[];
};

/**
 * GW winner overlay — reads confirmed weekly_results only.
 * Does not rebuild the league dashboard (that was a full FPL fan-out on every tab).
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

      const bootstrap = await getBootstrapStatic();
      const next = bootstrap.events.find(
        (event) => event.id === latest.gameweek + 1,
      );
      if (next) {
        if (next.finished) return null;
        const deadlineMs = Date.parse(next.deadline_time);
        if (Number.isFinite(deadlineMs) && Date.now() >= deadlineMs) {
          return null;
        }
      }

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
    } catch {
      return null;
    }
  },
);
