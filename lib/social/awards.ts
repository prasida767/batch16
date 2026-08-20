import "server-only";

import { asc, eq } from "drizzle-orm";
import { getDb, managers, weeklyAwards } from "@/lib/db";
import type { FplManagerHistory } from "@/lib/fpl";
import type { WeeklyGameweek } from "@/lib/league/types";
import {
  STANDARD_AWARD_KEYS,
  STANDARD_AWARD_TITLES,
  type AwardView,
} from "@/lib/social/types";

type Candidate = {
  entryId: number;
  managerId: number | null;
  name: string;
  points: number;
  climb: number;
};

function pickMax(
  rows: Candidate[],
  score: (row: Candidate) => number,
): Candidate | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) =>
    score(row) > score(best) ? row : best,
  );
}

function pickMin(
  rows: Candidate[],
  score: (row: Candidate) => number,
): Candidate | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) =>
    score(row) < score(best) ? row : best,
  );
}

/** Build the four standard awards for a finished gameweek. */
export function computeStandardAwards(args: {
  week: WeeklyGameweek;
  entryToManagerId: Map<number, number>;
  histories: Map<number, FplManagerHistory>;
}): Array<{
  awardKey: string;
  title: string;
  managerId: number | null;
  detail: string;
}> {
  const { week, entryToManagerId, histories } = args;
  const avg =
    week.rows.length > 0
      ? week.rows.reduce((sum, row) => sum + row.points, 0) / week.rows.length
      : 0;

  const candidates: Candidate[] = week.rows.map((row) => {
    const history = histories.get(row.entryId)?.current ?? [];
    const current = history.find((h) => h.event === week.gameweek);
    const previous = history.find((h) => h.event === week.gameweek - 1);
    const climb =
      previous?.overall_rank != null && current?.overall_rank != null
        ? previous.overall_rank - current.overall_rank
        : 0;

    return {
      entryId: row.entryId,
      managerId: entryToManagerId.get(row.entryId) ?? null,
      name: row.name,
      points: row.points,
      climb,
    };
  });

  const highest = pickMax(candidates, (c) => c.points);
  const worst = pickMin(candidates, (c) => c.points);
  const differential = pickMax(candidates, (c) => c.points - avg);
  const climb = pickMax(candidates, (c) => c.climb);

  return [
    {
      awardKey: STANDARD_AWARD_KEYS.HIGHEST_SCORE,
      title: STANDARD_AWARD_TITLES.highest_score,
      managerId: highest?.managerId ?? null,
      detail: highest ? `${highest.name} · ${highest.points} pts` : "—",
    },
    {
      awardKey: STANDARD_AWARD_KEYS.BEST_DIFFERENTIAL,
      title: STANDARD_AWARD_TITLES.best_differential,
      managerId: differential?.managerId ?? null,
      detail: differential
        ? `${differential.name} · ${differential.points} pts (${differential.points - avg >= 0 ? "+" : ""}${(differential.points - avg).toFixed(1)} vs avg)`
        : "—",
    },
    {
      awardKey: STANDARD_AWARD_KEYS.BIGGEST_CLIMB,
      title: STANDARD_AWARD_TITLES.biggest_climb,
      managerId: climb?.managerId ?? null,
      detail: climb
        ? `${climb.name} · ${climb.climb > 0 ? "+" : ""}${climb.climb} overall places`
        : "—",
    },
    {
      awardKey: STANDARD_AWARD_KEYS.WORST_WEEK,
      title: STANDARD_AWARD_TITLES.worst_week,
      managerId: worst?.managerId ?? null,
      detail: worst ? `${worst.name} · ${worst.points} pts` : "—",
    },
  ];
}

export async function upsertAutoAwards(
  gameweek: number,
  awards: ReturnType<typeof computeStandardAwards>,
) {
  const db = getDb();
  for (const award of awards) {
    await db
      .insert(weeklyAwards)
      .values({
        gameweek,
        awardKey: award.awardKey,
        title: award.title,
        managerId: award.managerId,
        detail: award.detail,
        isAuto: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [weeklyAwards.gameweek, weeklyAwards.awardKey],
        set: {
          title: award.title,
          managerId: award.managerId,
          detail: award.detail,
          isAuto: true,
          updatedAt: new Date(),
        },
      });
  }
}

export async function listAwardsForGameweek(
  gameweek: number,
): Promise<AwardView[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: weeklyAwards.id,
      gameweek: weeklyAwards.gameweek,
      awardKey: weeklyAwards.awardKey,
      title: weeklyAwards.title,
      managerId: weeklyAwards.managerId,
      managerName: managers.displayName,
      detail: weeklyAwards.detail,
      isAuto: weeklyAwards.isAuto,
    })
    .from(weeklyAwards)
    .leftJoin(managers, eq(weeklyAwards.managerId, managers.id))
    .where(eq(weeklyAwards.gameweek, gameweek))
    .orderBy(asc(weeklyAwards.id));

  return rows;
}

export async function listAwardGameweeks(): Promise<number[]> {
  const db = getDb();
  const rows = await db
    .selectDistinct({ gameweek: weeklyAwards.gameweek })
    .from(weeklyAwards)
    .orderBy(asc(weeklyAwards.gameweek));
  return rows.map((row) => row.gameweek).sort((a, b) => b - a);
}

export async function saveAward(input: {
  id?: number;
  gameweek: number;
  awardKey: string;
  title: string;
  managerId: number | null;
  detail: string | null;
  isAuto?: boolean;
}) {
  const db = getDb();
  const title = input.title.trim();
  if (!title) throw new Error("Title is required.");
  if (!Number.isInteger(input.gameweek) || input.gameweek <= 0) {
    throw new Error("Valid gameweek required.");
  }

  if (input.id) {
    await db
      .update(weeklyAwards)
      .set({
        title,
        managerId: input.managerId,
        detail: input.detail?.trim() || null,
        isAuto: false,
        updatedAt: new Date(),
      })
      .where(eq(weeklyAwards.id, input.id));
    return;
  }

  const awardKey =
    input.awardKey.startsWith("custom_")
      ? input.awardKey
      : `custom_${Date.now()}`;

  await db.insert(weeklyAwards).values({
    gameweek: input.gameweek,
    awardKey,
    title,
    managerId: input.managerId,
    detail: input.detail?.trim() || null,
    isAuto: false,
    updatedAt: new Date(),
  });
}

export async function deleteAward(id: number) {
  const db = getDb();
  await db.delete(weeklyAwards).where(eq(weeklyAwards.id, id));
}

export async function getLatestAwardsPreview(limit = 4): Promise<{
  gameweek: number;
  awards: AwardView[];
} | null> {
  const gws = await listAwardGameweeks();
  if (gws.length === 0) return null;
  const gameweek = gws[0]!;
  const awards = await listAwardsForGameweek(gameweek);
  return { gameweek, awards: awards.slice(0, limit) };
}
