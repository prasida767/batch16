import { describe, expect, it } from "vitest";
import {
  buildRivalriesBoard,
  computePairRecords,
  type RivalryManager,
} from "@/lib/rivalries/compute";
import type { WeeklyGameweek } from "@/lib/league/types";

function manager(entryId: number, displayName: string): RivalryManager {
  return {
    entryId,
    displayName,
    supportedTeamId: null,
    supportedTeamCode: null,
    avatarVariant: 0,
  };
}

function week(
  gameweek: number,
  scores: Array<{ id: number; points: number }>,
  finished = true,
): WeeklyGameweek {
  const rows = [...scores]
    .sort((a, b) => b.points - a.points)
    .map((row, index) => ({
      entryId: row.id,
      name: `M${row.id}`,
      teamName: "",
      points: row.points,
      rank: index + 1,
      isWinner: index === 0,
    }));
  return {
    gameweek,
    finished,
    isCurrent: false,
    winnerNames: rows[0] ? [rows[0].name] : [],
    winnerEntryIds: rows[0] ? [rows[0].entryId] : [],
    winnerPoints: rows[0]?.points ?? 0,
    rows,
  };
}

const alice = manager(1, "Alice");
const bob = manager(2, "Bob");
const cara = manager(3, "Cara");

describe("buildRivalriesBoard", () => {
  it("does not crash with no weeks or a single manager", () => {
    expect(buildRivalriesBoard([], [alice, bob]).pairs).toEqual([]);
    const solo = buildRivalriesBoard(
      [week(1, [{ id: 1, points: 50 }])],
      [alice],
    );
    expect(solo.heatmap).toEqual([[null]]);
    expect(solo.profiles[1]?.nemesis).toBeNull();
  });

  it("names nemesis and lucky charm from head-to-head results", () => {
    const weeks = [
      week(1, [
        { id: 2, points: 80 },
        { id: 1, points: 50 },
        { id: 3, points: 40 },
      ]),
      week(2, [
        { id: 2, points: 90 },
        { id: 1, points: 60 },
        { id: 3, points: 10 },
      ]),
      week(3, [
        { id: 1, points: 70 },
        { id: 2, points: 40 },
        { id: 3, points: 30 },
      ]),
    ];

    const board = buildRivalriesBoard(weeks, [alice, bob, cara]);
    const aliceProfile = board.profiles[1]!;
    const bobProfile = board.profiles[2]!;
    const caraProfile = board.profiles[3]!;

    const idsOf = (pair: { a: { entryId: number }; b: { entryId: number } } | null) =>
      pair ? [pair.a.entryId, pair.b.entryId] : [];

    expect(idsOf(aliceProfile.nemesis)).toContain(2);
    expect(idsOf(aliceProfile.luckyCharm)).toContain(3);
    expect(caraProfile.nemesis).not.toBeNull();
    expect(idsOf(bobProfile.luckyCharm)).toContain(3);
    expect(board.heatmap).toHaveLength(3);
    expect(board.heatmap[0]?.[2]).toBeGreaterThan(0.5);
  });

  it("fills the heatmap after a single finished gameweek", () => {
    const board = buildRivalriesBoard(
      [
        week(1, [
          { id: 1, points: 80 },
          { id: 2, points: 20 },
        ]),
      ],
      [alice, bob],
    );
    expect(board.heatmap[0]?.[1]).toBe(1);
    expect(board.heatmap[1]?.[0]).toBe(0);
    expect(board.profiles[1]?.luckyCharm).not.toBeNull();
    expect(board.profiles[1]?.nemesis).toBeNull();
    expect(board.profiles[2]?.nemesis).not.toBeNull();
  });
});

describe("computePairRecords", () => {
  it("ignores unfinished weeks", () => {
    const pairs = computePairRecords([
      week(1, [{ id: 1, points: 10 }, { id: 2, points: 5 }], false),
      week(2, [{ id: 1, points: 10 }, { id: 2, points: 5 }], true),
    ]);
    const rec = pairs.get("1:2");
    expect(rec?.games).toBe(1);
    expect(rec?.aWins).toBe(1);
  });
});
