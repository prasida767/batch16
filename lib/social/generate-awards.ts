import "server-only";

import { eq } from "drizzle-orm";
import { getDb, weeklyAwards } from "@/lib/db";
import { leagueRosterRows } from "@/lib/fpl";
import { getLeagueSnapshot } from "@/lib/league/queries";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";
import {
  computeStandardAwards,
  upsertAutoAwards,
} from "@/lib/social/awards";

/** Generate/refresh standard awards for a finished gameweek from FPL data. */
export async function generateAwardsForGameweek(gameweek: number) {
  const snapshot = await getLeagueSnapshot();
  if (snapshot.kind !== "ok") {
    throw new Error(
      snapshot.kind === "no_league"
        ? "FPL_LEAGUE_ID is not set."
        : snapshot.message,
    );
  }

  const weeks = buildWeeklyGameweeks(
    leagueRosterRows(snapshot.data.standings),
    snapshot.data.bootstrap,
    snapshot.data.histories,
    snapshot.data.db.weekly,
  );

  const week = weeks.find((w) => w.gameweek === gameweek);
  if (!week) throw new Error(`No data for GW${gameweek}.`);
  if (!week.finished) {
    throw new Error(
      `GW${gameweek} is not finished yet. Awards unlock after the gameweek is settled.`,
    );
  }

  const entryToManagerId = new Map(
    snapshot.data.db.managers
      .filter((m) => m.fplEntryId != null)
      .map((m) => [m.fplEntryId as number, m.id]),
  );

  const awards = computeStandardAwards({
    week,
    entryToManagerId,
    histories: snapshot.data.histories,
  });

  const db = getDb();
  const [existing] = await db
    .select({ id: weeklyAwards.id })
    .from(weeklyAwards)
    .where(eq(weeklyAwards.gameweek, gameweek))
    .limit(1);
  const firstPublish = !existing;

  await upsertAutoAwards(gameweek, awards);

  if (firstPublish) {
    const {
      createNotificationsForManagers,
      listNotifiableManagerIds,
      NOTIFICATION_TYPES,
    } = await import("@/lib/notifications");
    const ids = await listNotifiableManagerIds();
    await createNotificationsForManagers(ids, {
      type: NOTIFICATION_TYPES.AWARDS_PUBLISHED,
      title: `GW${gameweek} awards are out`,
      body: "New weekly awards have been published — see who took the plaudits.",
      href: "/awards",
      meta: { gameweek },
    });
  }

  return awards.length;
}
