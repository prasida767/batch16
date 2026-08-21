import "server-only";

import { asc, count, desc, eq } from "drizzle-orm";
import { cache } from "react";
import {
  getDb,
  isDatabaseConfigured,
  managers,
  seasonPrizes,
  seasons,
  weeklyWinners,
} from "@/lib/db";

export type PastSeasonSummary = {
  id: number;
  label: string;
  name: string;
  startYear: number;
  weeklyWinnerCount: number;
  prizeCount: number;
};

export type PastWeeklyWinner = {
  gameweek: number;
  points: number | null;
  managerId: number;
  managerName: string;
};

export type PastSeasonPrize = {
  prizeType: string;
  amount: string | null;
  managerId: number;
  managerName: string;
};

export type PastSeasonDetail = {
  season: PastSeasonSummary;
  prizes: PastSeasonPrize[];
  weeklyWinners: PastWeeklyWinner[];
  winCounts: Array<{ managerId: number; managerName: string; wins: number }>;
};

export type PastSeasonsData = {
  seasons: PastSeasonSummary[];
  selected: PastSeasonDetail | null;
};

export type CareerManagerStat = {
  managerId: number;
  managerName: string;
  weeklyWins: number;
  titles: number;
  runnerUps: number;
  prizes: number;
  seasonsPlayed: number;
  /** Weekly wins in earliest season they appear in. */
  firstSeasonWins: number;
  /** Weekly wins in latest season they appear in. */
  lastSeasonWins: number;
  /** last - first (positive = improved). */
  improvement: number;
  /** Wins per season label for charts. */
  winsBySeason: Array<{ label: string; wins: number }>;
};

export type PastSeasonsStats = {
  seasons: Array<{ id: number; label: string; startYear: number }>;
  byWeeklyWins: CareerManagerStat[];
  mostSuccessful: CareerManagerStat[];
  mostImproved: CareerManagerStat[];
  mostFaltered: CareerManagerStat[];
  titles: CareerManagerStat[];
};

const PRIZE_ORDER = [
  "overall_1st",
  "overall_2nd",
  "consolation",
  "highest_gw",
  "lucky_6th",
  "lucky_7th",
  "lucky_13th",
  "lucky_14th",
  "lucky_15th",
] as const;

export function prizeTypeLabel(prizeType: string): string {
  switch (prizeType) {
    case "overall_1st":
      return "Champion";
    case "overall_2nd":
      return "Runner-up";
    case "consolation":
      return "Consolation / Unlucky";
    case "highest_gw":
      return "Highest single GW";
    case "lucky_6th":
      return "Lucky 6th";
    case "lucky_7th":
      return "Lucky 7th";
    case "lucky_13th":
      return "Lucky 13th";
    case "lucky_14th":
      return "Lucky 14th";
    case "lucky_15th":
      return "Lucky 15th";
    default:
      return prizeType.replace(/_/g, " ");
  }
}

function prizeSortKey(prizeType: string): number {
  const idx = PRIZE_ORDER.indexOf(
    prizeType as (typeof PRIZE_ORDER)[number],
  );
  return idx === -1 ? 100 : idx;
}

async function loadSeasonSummaries(): Promise<PastSeasonSummary[]> {
  const db = getDb();
  const seasonRows = await db
    .select()
    .from(seasons)
    .orderBy(desc(seasons.startYear));

  if (seasonRows.length === 0) return [];

  const weeklyCounts = await db
      .select({
        seasonId: weeklyWinners.seasonId,
        value: count(),
      })
      .from(weeklyWinners)
      .groupBy(weeklyWinners.seasonId);
  const prizeCounts = await db
      .select({
        seasonId: seasonPrizes.seasonId,
        value: count(),
      })
      .from(seasonPrizes)
      .groupBy(seasonPrizes.seasonId);

  const weeklyMap = new Map(
    weeklyCounts.map((row) => [row.seasonId, row.value]),
  );
  const prizeMap = new Map(prizeCounts.map((row) => [row.seasonId, row.value]));

  return seasonRows.map((season) => ({
    id: season.id,
    label: season.label,
    name: season.name,
    startYear: season.startYear,
    weeklyWinnerCount: weeklyMap.get(season.id) ?? 0,
    prizeCount: prizeMap.get(season.id) ?? 0,
  }));
}

async function loadSeasonDetail(
  seasonId: number,
  summary: PastSeasonSummary,
): Promise<PastSeasonDetail> {
  const db = getDb();

  const weeklyRows = await db
    .select({
      gameweek: weeklyWinners.gameweek,
      points: weeklyWinners.points,
      managerId: weeklyWinners.managerId,
      managerName: managers.displayName,
    })
    .from(weeklyWinners)
    .innerJoin(managers, eq(weeklyWinners.managerId, managers.id))
    .where(eq(weeklyWinners.seasonId, seasonId))
    .orderBy(asc(weeklyWinners.gameweek));

  const prizeRows = await db
    .select({
      prizeType: seasonPrizes.prizeType,
      amount: seasonPrizes.amount,
      managerId: seasonPrizes.managerId,
      managerName: managers.displayName,
    })
    .from(seasonPrizes)
    .innerJoin(managers, eq(seasonPrizes.managerId, managers.id))
    .where(eq(seasonPrizes.seasonId, seasonId));

  prizeRows.sort((a, b) => prizeSortKey(a.prizeType) - prizeSortKey(b.prizeType));

  const winMap = new Map<number, { managerName: string; wins: number }>();
  for (const row of weeklyRows) {
    const existing = winMap.get(row.managerId);
    if (existing) {
      existing.wins += 1;
    } else {
      winMap.set(row.managerId, {
        managerName: row.managerName,
        wins: 1,
      });
    }
  }

  const winCounts = [...winMap.entries()]
    .map(([managerId, value]) => ({
      managerId,
      managerName: value.managerName,
      wins: value.wins,
    }))
    .sort((a, b) => b.wins - a.wins || a.managerName.localeCompare(b.managerName));

  return {
    season: summary,
    prizes: prizeRows,
    weeklyWinners: weeklyRows,
    winCounts,
  };
}

export const getPastSeasonsData = cache(
  async (selectedLabel?: string | null): Promise<
    | { kind: "ok"; data: PastSeasonsData }
    | { kind: "no_db" }
    | { kind: "empty" }
  > => {
    if (!isDatabaseConfigured()) return { kind: "no_db" };

    try {
      const seasonList = await loadSeasonSummaries();
      if (seasonList.length === 0) return { kind: "empty" };

      const selectedSummary =
        seasonList.find((s) => s.label === selectedLabel) ?? seasonList[0]!;

      const selected = await loadSeasonDetail(
        selectedSummary.id,
        selectedSummary,
      );

      return {
        kind: "ok",
        data: {
          seasons: seasonList,
          selected,
        },
      };
    } catch (error) {
      console.error("[history] Failed to load past seasons", error);
      return { kind: "empty" };
    }
  },
);

/**
 * Cross-season career stats for charts — only uses history tables
 * (weekly_winners / season_prizes), not the live league roster.
 */
export const getPastSeasonsStats = cache(
  async (): Promise<
    | { kind: "ok"; data: PastSeasonsStats }
    | { kind: "no_db" }
    | { kind: "empty" }
  > => {
    if (!isDatabaseConfigured()) return { kind: "no_db" };

    try {
      const db = getDb();
      const seasonRows = await db
        .select({
          id: seasons.id,
          label: seasons.label,
          startYear: seasons.startYear,
        })
        .from(seasons)
        .orderBy(asc(seasons.startYear));

      if (seasonRows.length === 0) return { kind: "empty" };

      const weeklyRows = await db
          .select({
            seasonId: weeklyWinners.seasonId,
            managerId: weeklyWinners.managerId,
            managerName: managers.displayName,
          })
          .from(weeklyWinners)
          .innerJoin(managers, eq(weeklyWinners.managerId, managers.id));
      const prizeRows = await db
          .select({
            seasonId: seasonPrizes.seasonId,
            prizeType: seasonPrizes.prizeType,
            managerId: seasonPrizes.managerId,
            managerName: managers.displayName,
          })
          .from(seasonPrizes)
          .innerJoin(managers, eq(seasonPrizes.managerId, managers.id));

      if (weeklyRows.length === 0 && prizeRows.length === 0) {
        return { kind: "empty" };
      }

      type Acc = {
        managerName: string;
        weeklyWins: number;
        titles: number;
        runnerUps: number;
        prizes: number;
        winsBySeasonId: Map<number, number>;
      };

      const byManager = new Map<number, Acc>();

      function ensure(id: number, name: string): Acc {
        let row = byManager.get(id);
        if (!row) {
          row = {
            managerName: name,
            weeklyWins: 0,
            titles: 0,
            runnerUps: 0,
            prizes: 0,
            winsBySeasonId: new Map(),
          };
          byManager.set(id, row);
        }
        return row;
      }

      for (const row of weeklyRows) {
        const acc = ensure(row.managerId, row.managerName);
        acc.weeklyWins += 1;
        acc.winsBySeasonId.set(
          row.seasonId,
          (acc.winsBySeasonId.get(row.seasonId) ?? 0) + 1,
        );
      }

      for (const row of prizeRows) {
        const acc = ensure(row.managerId, row.managerName);
        acc.prizes += 1;
        if (row.prizeType === "overall_1st") acc.titles += 1;
        if (row.prizeType === "overall_2nd") acc.runnerUps += 1;
      }

      const stats: CareerManagerStat[] = [...byManager.entries()].map(
        ([managerId, acc]) => {
          const winsBySeason = seasonRows.map((season) => ({
            label: season.label,
            wins: acc.winsBySeasonId.get(season.id) ?? 0,
          }));
          const active = winsBySeason.filter((s) => s.wins > 0);
          const firstSeasonWins = active[0]?.wins ?? 0;
          const lastSeasonWins = active.at(-1)?.wins ?? 0;
          const seasonsPlayed = new Set([
            ...acc.winsBySeasonId.keys(),
            ...prizeRows
              .filter((p) => p.managerId === managerId)
              .map((p) => p.seasonId),
          ]).size;

          return {
            managerId,
            managerName: acc.managerName,
            weeklyWins: acc.weeklyWins,
            titles: acc.titles,
            runnerUps: acc.runnerUps,
            prizes: acc.prizes,
            seasonsPlayed: Math.max(seasonsPlayed, active.length),
            firstSeasonWins,
            lastSeasonWins,
            improvement: lastSeasonWins - firstSeasonWins,
            winsBySeason,
          };
        },
      );

      const byWeeklyWins = [...stats].sort(
        (a, b) =>
          b.weeklyWins - a.weeklyWins ||
          b.titles - a.titles ||
          a.managerName.localeCompare(b.managerName),
      );

      const mostSuccessful = [...stats].sort(
        (a, b) =>
          b.titles * 10 +
            b.runnerUps * 4 +
            b.weeklyWins -
            (a.titles * 10 + a.runnerUps * 4 + a.weeklyWins) ||
          a.managerName.localeCompare(b.managerName),
      );

      const multiSeason = stats.filter((s) => s.seasonsPlayed >= 2);
      const mostImproved = [...multiSeason]
        .sort(
          (a, b) =>
            b.improvement - a.improvement ||
            b.lastSeasonWins - a.lastSeasonWins,
        )
        .filter((s) => s.improvement > 0);
      const mostFaltered = [...multiSeason]
        .sort(
          (a, b) =>
            a.improvement - b.improvement ||
            a.lastSeasonWins - b.lastSeasonWins,
        )
        .filter((s) => s.improvement < 0);

      const titles = [...stats]
        .filter((s) => s.titles > 0)
        .sort((a, b) => b.titles - a.titles);

      return {
        kind: "ok",
        data: {
          seasons: seasonRows,
          byWeeklyWins,
          mostSuccessful,
          mostImproved,
          mostFaltered,
          titles,
        },
      };
    } catch (error) {
      console.error("[history] Failed to load past season stats", error);
      return { kind: "empty" };
    }
  },
);
