import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import {
  getDb,
  isDatabaseConfigured,
  managers,
  weeklyResults,
} from "@/lib/db";
import {
  celebrationFromWinnerRows,
  type GwWinnerView,
} from "@/lib/league/winners";

export type GwWinnerPerson = GwWinnerView["winners"][number];
export type GwWinnerCelebration = GwWinnerView;

/**
 * GW winner overlay from weekly_results only.
 * Must not call getDashboardData() — that rebuilds every FPL history on each tab.
 * Reads every weekly row and flags winners in JS so a drizzle boolean WHERE
 * cannot hide an admin-saved winner.
 */
export async function loadActiveGwWinnerCelebration(): Promise<GwWinnerCelebration | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const db = getDb();
    const rows = await db
      .select({
        gameweek: weeklyResults.gameweek,
        isWinner: weeklyResults.isWinner,
        points: weeklyResults.points,
        entryId: managers.fplEntryId,
        name: managers.displayName,
        avatarUrl: managers.avatarUrl,
        supportedTeamId: managers.supportedTeamId,
        supportedTeamCode: managers.supportedTeamCode,
        avatarVariant: managers.avatarVariant,
      })
      .from(weeklyResults)
      .innerJoin(managers, eq(managers.id, weeklyResults.managerId));

    return celebrationFromWinnerRows(rows);
  } catch (error) {
    unstable_rethrow(error);
    console.error("[celebration] load failed", error);
    return null;
  }
}

export const getActiveGwWinnerCelebration = cache(
  loadActiveGwWinnerCelebration,
);
