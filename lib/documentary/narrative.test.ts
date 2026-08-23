import { describe, expect, it } from "vitest";
import { isDocumentaryWeekEligible } from "@/lib/documentary/eligibility";
import { narrateWeeklyEpisode } from "@/lib/documentary/narrative";
import type { WeeklyGameweek } from "@/lib/league/types";

function week(
  gameweek: number,
  rows: Array<{ name: string; points: number; rank: number }>,
  finished = true,
): WeeklyGameweek {
  return {
    gameweek,
    finished,
    isCurrent: false,
    winnerNames: rows[0] ? [rows[0].name] : [],
    winnerEntryIds: [],
    winnerPoints: rows[0]?.points ?? 0,
    rows: rows.map((row, index) => ({
      entryId: index + 1,
      name: row.name,
      teamName: "",
      points: row.points,
      rank: row.rank,
      isWinner: index === 0,
    })),
  };
}

describe("isDocumentaryWeekEligible", () => {
  it("rejects unfinished or zero-point weeks", () => {
    expect(
      isDocumentaryWeekEligible(week(1, [{ name: "A", points: 0, rank: 1 }])),
    ).toBe(false);
    expect(
      isDocumentaryWeekEligible(
        week(1, [{ name: "A", points: 50, rank: 1 }], false),
      ),
    ).toBe(false);
    expect(
      isDocumentaryWeekEligible(week(1, [{ name: "A", points: 50, rank: 1 }])),
    ).toBe(true);
  });
});

describe("narrateWeeklyEpisode", () => {
  it("handles missing histories, no previous week, and empty rows", () => {
    const empty = narrateWeeklyEpisode({
      week: week(1, []),
      previous: null,
      histories: new Map(),
      nextGameweek: 2,
      seasonComplete: false,
      tableLeaderName: null,
    });
    expect(empty.title.length).toBeGreaterThan(0);
    expect(empty.biggestShock).toContain("Gameweek 1");

    const body = narrateWeeklyEpisode({
      week: week(3, [
        { name: "Alice", points: 90, rank: 1 },
        { name: "Bob", points: 40, rank: 2 },
      ]),
      previous: week(2, [
        { name: "Alice", points: 30, rank: 2 },
        { name: "Bob", points: 80, rank: 1 },
      ]),
      histories: new Map(),
      nextGameweek: 4,
      seasonComplete: false,
      tableLeaderName: "Alice",
    });
    expect(body.biggestShock).toContain("Alice");
    expect(body.dramaticOvertake.length).toBeGreaterThan(0);
    expect(body.worstDecision.length).toBeGreaterThan(0);
  });
});
