import { describe, expect, it } from "vitest";
import { managersInPot, totalPot } from "@/lib/prizes";
import { buildLedger } from "@/lib/league/ledger";
import type { StoredManager } from "@/lib/league/db";
import type { PrizeSnapshot } from "@/lib/league/types";
import type { FplLeagueStandingRow } from "@/lib/fpl";

const prize = {
  entryFee: "5000",
  weeklyWinner: "0",
  overall1st: "0",
  overall2nd: "0",
  lastPlace: "0",
  customPrizes: [],
  currency: "NPR",
  entryFeeNum: 5000,
  weeklyWinnerNum: 0,
  overall1stNum: 0,
  overall2ndNum: 0,
  lastPlaceNum: 0,
  customPrizesTotalNum: 0,
} satisfies PrizeSnapshot;

function standing(entry: number, name: string): FplLeagueStandingRow {
  return {
    id: entry,
    event_total: 0,
    player_name: name,
    rank: 1,
    last_rank: 1,
    rank_sort: 1,
    total: 0,
    entry,
    entry_name: `${name} FC`,
  };
}

function stored(
  partial: Partial<StoredManager> & { id: number; fplEntryId: number },
): StoredManager {
  return {
    name: "Manager",
    displayName: "Manager",
    avatarUrl: null,
    supportedTeamId: null,
    supportedTeamCode: null,
    avatarVariant: 0,
    currentBalance: null,
    entryFeePaid: false,
    verified: false,
    activityPoints: 0,
    ...partial,
  };
}

describe("prize pot from verified managers", () => {
  it("counts only claimed seats", () => {
    expect(
      managersInPot([
        { fplEntryId: 1, verified: true },
        { fplEntryId: 2, verified: true },
        { fplEntryId: 3, verified: false },
        { fplEntryId: null, verified: true },
      ]),
    ).toBe(2);
    expect(totalPot(5000, 4)).toBe(20000);
  });
});

describe("ledger entry fees", () => {
  it("does not allocate an entry fee until the manager is verified", () => {
    const ledger = buildLedger({
      results: [standing(1, "Joined"), standing(2, "Waiting")],
      managers: [
        stored({ id: 10, fplEntryId: 1, verified: true, displayName: "Joined" }),
        stored({
          id: 11,
          fplEntryId: 2,
          verified: false,
          displayName: "Waiting",
        }),
      ],
      prize,
      weeks: [],
      seasonComplete: false,
    });

    const joined = ledger.find((row) => row.entryId === 1);
    const waiting = ledger.find((row) => row.entryId === 2);
    expect(joined?.balance).toBe(-5000);
    expect(waiting?.balance).toBe(0);
    expect(waiting?.entryFeePaid).toBe(false);
  });
});
