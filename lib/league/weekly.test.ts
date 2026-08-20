import { describe, expect, it } from "vitest";
import {
  canAutoDeclareWinners,
  isFplGameweekSettled,
} from "@/lib/league/winners";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";
import type { FplBootstrapStatic, FplLeagueStandingRow } from "@/lib/fpl";

function standing(
  entry: number,
  name: string,
  rank = 1,
): FplLeagueStandingRow {
  return {
    id: entry,
    event_total: 0,
    player_name: name,
    rank,
    last_rank: rank,
    rank_sort: rank,
    total: 0,
    entry,
    entry_name: `${name} FC`,
  };
}

function bootstrap(
  events: Array<{
    id: number;
    finished: boolean;
    data_checked: boolean;
    is_current?: boolean;
  }>,
): FplBootstrapStatic {
  return {
    events: events.map((e) => ({
      id: e.id,
      name: `Gameweek ${e.id}`,
      deadline_time: "2026-08-01T00:00:00Z",
      average_entry_score: 0,
      finished: e.finished,
      data_checked: e.data_checked,
      highest_scoring_entry: null,
      is_previous: false,
      is_current: Boolean(e.is_current),
      is_next: false,
    })),
    teams: [],
    elements: [],
    element_types: [],
    total_players: 0,
  };
}

describe("isFplGameweekSettled", () => {
  it("requires finished and data_checked", () => {
    expect(isFplGameweekSettled({ finished: true, data_checked: true })).toBe(
      true,
    );
    expect(isFplGameweekSettled({ finished: true, data_checked: false })).toBe(
      false,
    );
    expect(isFplGameweekSettled({ finished: false, data_checked: true })).toBe(
      false,
    );
  });
});

describe("canAutoDeclareWinners", () => {
  it("blocks unfinished or zero-point weeks", () => {
    expect(
      canAutoDeclareWinners({
        event: { finished: false, data_checked: false },
        scores: [{ points: 50 }, { points: 40 }],
        rosterSize: 2,
        historiesLoaded: 2,
      }),
    ).toBe(false);

    expect(
      canAutoDeclareWinners({
        event: { finished: true, data_checked: true },
        scores: [{ points: 0 }, { points: 0 }],
        rosterSize: 2,
        historiesLoaded: 2,
      }),
    ).toBe(false);
  });

  it("blocks when too few histories loaded", () => {
    expect(
      canAutoDeclareWinners({
        event: { finished: true, data_checked: true },
        scores: [{ points: 50 }, { points: 0 }],
        rosterSize: 4,
        historiesLoaded: 1,
      }),
    ).toBe(false);
  });
});

describe("buildWeeklyGameweeks winners", () => {
  const roster = [
    standing(1, "Abhishek Gupta", 1),
    standing(2, "Prasiddha Khadka", 2),
  ];

  it("does not crown anyone for unplayed GW1 (0 pts, not finished)", () => {
    const weeks = buildWeeklyGameweeks(
      roster,
      bootstrap([
        {
          id: 1,
          finished: false,
          data_checked: false,
          is_current: true,
        },
      ]),
      new Map([
        [1, { current: [{ event: 1, points: 0 }] }],
        [2, { current: [{ event: 1, points: 0 }] }],
      ]),
    );

    const gw1 = weeks.find((w) => w.gameweek === 1)!;
    expect(gw1.finished).toBe(false);
    expect(gw1.winnerEntryIds).toEqual([]);
    expect(gw1.winnerNames).toEqual([]);
    expect(gw1.rows.every((r) => !r.isWinner)).toBe(true);
  });

  it("does not auto-crown mid-gameweek when someone has provisional points", () => {
    const weeks = buildWeeklyGameweeks(
      roster,
      bootstrap([
        {
          id: 1,
          finished: false,
          data_checked: false,
          is_current: true,
        },
      ]),
      new Map([
        [1, { current: [{ event: 1, points: 44 }] }],
        [2, { current: [{ event: 1, points: 12 }] }],
      ]),
    );

    const gw1 = weeks.find((w) => w.gameweek === 1)!;
    expect(gw1.finished).toBe(false);
    expect(gw1.winnerEntryIds).toEqual([]);
  });

  it("auto-declares winners only after FPL settles with real scores", () => {
    const weeks = buildWeeklyGameweeks(
      roster,
      bootstrap([
        {
          id: 1,
          finished: true,
          data_checked: true,
          is_current: false,
        },
      ]),
      new Map([
        [1, { current: [{ event: 1, points: 72 }] }],
        [2, { current: [{ event: 1, points: 55 }] }],
      ]),
    );

    const gw1 = weeks.find((w) => w.gameweek === 1)!;
    expect(gw1.finished).toBe(true);
    expect(gw1.winnerEntryIds).toEqual([1]);
    expect(gw1.winnerNames).toEqual(["Abhishek Gupta"]);
    expect(gw1.winnerPoints).toBe(72);
  });

  it("allows admin confirmation to declare winners before FPL settles", () => {
    const weeks = buildWeeklyGameweeks(
      roster,
      bootstrap([
        {
          id: 1,
          finished: false,
          data_checked: false,
          is_current: true,
        },
      ]),
      new Map([
        [1, { current: [{ event: 1, points: 10 }] }],
        [2, { current: [{ event: 1, points: 8 }] }],
      ]),
      [
        {
          gameweek: 1,
          managerId: 10,
          fplEntryId: 2,
          points: 8,
          rank: 2,
          isWinner: true,
        },
        {
          gameweek: 1,
          managerId: 11,
          fplEntryId: 1,
          points: 10,
          rank: 1,
          isWinner: false,
        },
      ],
    );

    const gw1 = weeks.find((w) => w.gameweek === 1)!;
    expect(gw1.manuallySet).toBe(true);
    expect(gw1.finished).toBe(true);
    expect(gw1.winnerEntryIds).toEqual([2]);
    expect(gw1.winnerNames).toEqual(["Prasiddha Khadka"]);
  });
});
