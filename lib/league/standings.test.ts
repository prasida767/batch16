import { describe, expect, it } from "vitest";
import {
  compareStandings,
  mergeLiveStandings,
  sanitizeStandings,
} from "@/lib/league/standings";
import type { ManagerStanding } from "@/lib/league/types";

function row(
  partial: Partial<ManagerStanding> & { entryId: number },
): ManagerStanding {
  return {
    managerId: null,
    name: "Manager",
    displayName: "Manager",
    teamName: "Team",
    avatarUrl: null,
    supportedTeamId: null,
    supportedTeamCode: null,
    avatarVariant: 0,
    rank: 1,
    lastRank: 1,
    totalPoints: 0,
    eventPoints: 0,
    livePoints: null,
    balance: 0,
    entryFeePaid: false,
    verified: false,
    weeksWon: 0,
    activityPoints: 0,
    ...partial,
  };
}

describe("sanitizeStandings", () => {
  it("sorts by FPL rank then total points", () => {
    const sorted = sanitizeStandings([
      row({ entryId: 2, rank: 2, displayName: "B", totalPoints: 80 }),
      row({ entryId: 1, rank: 1, displayName: "A", totalPoints: 90 }),
      row({ entryId: 3, rank: 3, displayName: "C", totalPoints: 70 }),
    ]);
    expect(sorted.map((item) => item.entryId)).toEqual([1, 2, 3]);
  });

  it("drops invalid entries and fills missing names", () => {
    const sorted = sanitizeStandings([
      row({ entryId: 0, displayName: "Ghost" }),
      row({
        entryId: 11,
        displayName: "  ",
        name: "",
        teamName: "   ",
        rank: 1,
      }),
    ]);
    expect(sorted).toHaveLength(1);
    expect(sorted[0]?.displayName).toBe("Entry 11");
    expect(sorted[0]?.teamName).toBe("—");
  });

  it("assigns ranks when FPL has not published them yet", () => {
    const sorted = sanitizeStandings([
      row({ entryId: 2, rank: 0, totalPoints: 10, displayName: "Low" }),
      row({ entryId: 1, rank: 0, totalPoints: 50, displayName: "High" }),
    ]);
    expect(sorted[0]?.entryId).toBe(1);
    expect(sorted[0]?.rank).toBe(1);
    expect(sorted[1]?.rank).toBe(2);
  });

  it("does not crash on an empty list", () => {
    expect(sanitizeStandings([])).toEqual([]);
  });
});

describe("compareStandings", () => {
  it("puts missing ranks last", () => {
    const a = row({ entryId: 1, rank: 0, totalPoints: 99, displayName: "A" });
    const b = row({ entryId: 2, rank: 2, totalPoints: 10, displayName: "B" });
    expect(compareStandings(b, a)).toBeLessThan(0);
  });
});

describe("mergeLiveStandings", () => {
  it("keeps managers missing from a partial live payload", () => {
    const current = [
      row({ entryId: 1, rank: 1, displayName: "A", verified: true }),
      row({ entryId: 2, rank: 2, displayName: "B", verified: false }),
    ];
    const merged = mergeLiveStandings(current, [
      {
        entryId: 1,
        playerName: "A",
        teamName: "A FC",
        rank: 1,
        lastRank: 2,
        totalPoints: 12,
        eventPoints: 4,
        livePoints: 5,
      },
    ]);
    expect(merged.map((item) => item.entryId)).toEqual([1, 2]);
    expect(merged[0]?.livePoints).toBe(5);
    expect(merged[1]?.displayName).toBe("B");
  });
});
