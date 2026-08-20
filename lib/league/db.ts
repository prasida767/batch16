import "server-only";

import { cache } from "react";
import { eq } from "drizzle-orm";
import {
  getDb,
  isDatabaseConfigured,
  managers,
  managerAccounts,
  prizeConfig,
  weeklyResults,
  balances,
} from "@/lib/db";
import {
  DEFAULT_CURRENCY,
  EMPTY_PRIZE_CONFIG,
  customPrizesTotal,
  parseCustomPrizes,
  parseMoney,
  type PrizeConfigFormValues,
} from "@/lib/prizes";
import type { PrizeSnapshot } from "./types";

export type StoredManager = {
  id: number;
  fplEntryId: number | null;
  name: string;
  displayName: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
  currentBalance: string | null;
  entryFeePaid: boolean;
  /** Linked via manager_accounts after register + claim. */
  verified: boolean;
  activityPoints: number;
};

export type StoredWeeklyResult = {
  gameweek: number;
  managerId: number;
  fplEntryId: number | null;
  points: number;
  rank: number;
  isWinner: boolean;
};

export type LeagueDbState = {
  configured: boolean;
  prize: PrizeSnapshot;
  managers: StoredManager[];
  weekly: StoredWeeklyResult[];
};

function toPrizeSnapshot(values: PrizeConfigFormValues): PrizeSnapshot {
  return {
    ...values,
    entryFeeNum: parseMoney(values.entryFee),
    weeklyWinnerNum: parseMoney(values.weeklyWinner),
    overall1stNum: parseMoney(values.overall1st),
    overall2ndNum: parseMoney(values.overall2nd),
    lastPlaceNum: parseMoney(values.lastPlace),
    customPrizesTotalNum: customPrizesTotal(values.customPrizes),
  };
}

export const getLeagueDbState = cache(async (): Promise<LeagueDbState> => {
  return loadLeagueDbState();
});

/** Bypass React cache — use after writes in the same request. */
export async function getLeagueDbStateFresh(): Promise<LeagueDbState> {
  return loadLeagueDbState();
}

const LEAGUE_DB_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`[league] ${label} timed out after ${LEAGUE_DB_TIMEOUT_MS}ms`));
    }, LEAGUE_DB_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function loadLeagueDbState(): Promise<LeagueDbState> {
  const empty: LeagueDbState = {
    configured: false,
    prize: toPrizeSnapshot(EMPTY_PRIZE_CONFIG),
    managers: [],
    weekly: [],
  };

  if (!isDatabaseConfigured()) return empty;

  try {
    const db = getDb();
    // Sequential on purpose: max:1 + transaction pooler cannot safely pipeline.
    // (Parallel Promise.all was hanging queries like prize_config for minutes.)
    const configRows = await withTimeout(
      db.select().from(prizeConfig).limit(1),
      "prize_config",
    );
    const managerRows = await withTimeout(
      db
        .select({
          id: managers.id,
          fplEntryId: managers.fplEntryId,
          name: managers.name,
          displayName: managers.displayName,
          avatarUrl: managers.avatarUrl,
          supportedTeamId: managers.supportedTeamId,
          supportedTeamCode: managers.supportedTeamCode,
          avatarVariant: managers.avatarVariant,
          currentBalance: balances.currentBalance,
          entryFeePaid: balances.entryFeePaid,
          activityPoints: managers.activityPoints,
          accountUserId: managerAccounts.userId,
        })
        .from(managers)
        .leftJoin(balances, eq(balances.managerId, managers.id))
        .leftJoin(managerAccounts, eq(managerAccounts.managerId, managers.id)),
      "managers",
    );
    const weeklyRows = await withTimeout(
      db
        .select({
          gameweek: weeklyResults.gameweek,
          managerId: weeklyResults.managerId,
          fplEntryId: managers.fplEntryId,
          points: weeklyResults.points,
          rank: weeklyResults.rank,
          isWinner: weeklyResults.isWinner,
        })
        .from(weeklyResults)
        .innerJoin(managers, eq(weeklyResults.managerId, managers.id)),
      "weekly_results",
    );

    const configRow = configRows[0];

    const prizeValues: PrizeConfigFormValues = configRow
      ? {
          entryFee: configRow.entryFee,
          weeklyWinner: configRow.weeklyWinner,
          overall1st: configRow.overall1st,
          overall2nd: configRow.overall2nd,
          lastPlace: configRow.lastPlace,
          customPrizes: parseCustomPrizes(configRow.customPrizes),
          currency: configRow.currency || DEFAULT_CURRENCY,
        }
      : EMPTY_PRIZE_CONFIG;

    return {
      configured: true,
      prize: toPrizeSnapshot(prizeValues),
      managers: managerRows.map((row) => ({
        id: row.id,
        fplEntryId: row.fplEntryId,
        name: row.name,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        supportedTeamId: row.supportedTeamId ?? null,
        supportedTeamCode: row.supportedTeamCode ?? null,
        avatarVariant: row.avatarVariant ?? 0,
        currentBalance: row.currentBalance,
        entryFeePaid: Boolean(row.entryFeePaid),
        verified: Boolean(row.accountUserId),
        activityPoints: row.activityPoints,
      })),
      weekly: weeklyRows,
    };
  } catch (error) {
    console.error("[league] Database read failed", error);
    return empty;
  }
}
