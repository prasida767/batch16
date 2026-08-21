import "server-only";

import { cache } from "react";
import { asc, desc, eq, isNotNull } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  activityEvents,
  managers,
} from "@/lib/db";
import { getActivityPrizeDisplay } from "@/lib/activity/award";
import type {
  ActivityEventRow,
  ActivityLeaderboardRow,
} from "@/lib/activity/types";

export type ActivityBoardData = {
  prizeDisplay: string;
  rows: ActivityLeaderboardRow[];
};

export const getActivityLeaderboard = cache(
  async (): Promise<
    | { kind: "ok"; data: ActivityBoardData }
    | { kind: "no_db" }
  > => {
    if (!isDatabaseConfigured()) return { kind: "no_db" };

    const db = getDb();
    const prizeDisplay = await getActivityPrizeDisplay();
    const managerRows = await db
      .select({
        managerId: managers.id,
        fplEntryId: managers.fplEntryId,
        displayName: managers.displayName,
        avatarUrl: managers.avatarUrl,
        activityPoints: managers.activityPoints,
      })
      .from(managers)
      .where(isNotNull(managers.fplEntryId))
      .orderBy(desc(managers.activityPoints), asc(managers.displayName));

    const rows: ActivityLeaderboardRow[] = managerRows.map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

    return { kind: "ok", data: { prizeDisplay, rows } };
  },
);

export async function getManagerActivityPoints(
  managerId: number,
): Promise<number> {
  const db = getDb();
  const [row] = await db
    .select({ activityPoints: managers.activityPoints })
    .from(managers)
    .where(eq(managers.id, managerId))
    .limit(1);
  return row?.activityPoints ?? 0;
}

export async function listRecentActivityEvents(
  limit = 40,
): Promise<ActivityEventRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: activityEvents.id,
      managerId: activityEvents.managerId,
      managerName: managers.displayName,
      delta: activityEvents.delta,
      reason: activityEvents.reason,
      actionKey: activityEvents.actionKey,
      createdAt: activityEvents.createdAt,
    })
    .from(activityEvents)
    .innerJoin(managers, eq(activityEvents.managerId, managers.id))
    .orderBy(desc(activityEvents.createdAt))
    .limit(limit);

  return rows;
}

export async function listLeagueManagersForActivity() {
  const db = getDb();
  return db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      fplEntryId: managers.fplEntryId,
      activityPoints: managers.activityPoints,
    })
    .from(managers)
    .where(isNotNull(managers.fplEntryId))
    .orderBy(asc(managers.displayName));
}
