import { describe, expect, it } from "vitest";
import { rankDelta } from "@/lib/league/format";
import {
  computeLiveGwPoints,
  pressureCrowdMeters,
  projectedTotal,
  rankByLiveProjection,
  rankByOfficial,
  sanitizeLiveStandings,
} from "@/lib/league/live";
import type { LiveStandingUpdate } from "@/lib/league/types";

function row(
  partial: Partial<LiveStandingUpdate> & { entryId: number },
): LiveStandingUpdate {
  return {
    playerName: "Manager",
    teamName: "Team",
    rank: 1,
    lastRank: 1,
    totalPoints: 0,
    eventPoints: 0,
    livePoints: null,
    ...partial,
  };
}

describe("live standings helpers", () => {
  it("computes rank rise/fall for live table animations", () => {
    expect(rankDelta(1, 3)).toBeGreaterThan(0);
    expect(rankDelta(5, 2)).toBeLessThan(0);
    expect(rankDelta(4, 4)).toBe(0);
  });

  it("drops invalid rows and fills missing names", () => {
    const cleaned = sanitizeLiveStandings([
      row({ entryId: 0 }),
      row({ entryId: 2, playerName: "  ", teamName: "" }),
    ]);
    expect(cleaned).toHaveLength(1);
    expect(cleaned[0]?.playerName).toBe("Entry 2");
    expect(cleaned[0]?.teamName).toBe("—");
  });

  it("ranks by live projected total when live points exist", () => {
    const ranked = rankByLiveProjection([
      row({
        entryId: 1,
        playerName: "A",
        totalPoints: 100,
        eventPoints: 10,
        livePoints: 40,
      }),
      row({
        entryId: 2,
        playerName: "B",
        totalPoints: 120,
        eventPoints: 20,
        livePoints: 5,
      }),
    ]);
    // A: 100 - 10 + 40 = 130; B: 120 - 20 + 5 = 105
    expect(ranked.map((item) => item.entryId)).toEqual([1, 2]);
    expect(ranked[0]?.displayRank).toBe(1);
    expect(ranked[0]?.displayTotal).toBe(130);
  });

  it("falls back to official totals when live points are missing", () => {
    const ranked = rankByLiveProjection([
      row({ entryId: 2, playerName: "B", totalPoints: 50, eventPoints: 8 }),
      row({ entryId: 1, playerName: "A", totalPoints: 80, eventPoints: 4 }),
    ]);
    expect(ranked[0]?.entryId).toBe(1);
    expect(projectedTotal(ranked[0]!)).toBe(80);
  });

  it("keeps official rank order for the overall pitch", () => {
    const ranked = rankByOfficial([
      row({ entryId: 3, rank: 3, playerName: "C" }),
      row({ entryId: 1, rank: 1, playerName: "A" }),
    ]);
    expect(ranked.map((item) => item.entryId)).toEqual([1, 3]);
  });

  it("does not crash when live elements or picks are missing", () => {
    expect(computeLiveGwPoints(undefined, { elements: [null as never] }, null)).toBe(0);
    expect(computeLiveGwPoints([], { elements: [] }, null)).toBe(0);
    expect(sanitizeLiveStandings([])).toEqual([]);
    expect(rankByLiveProjection([])).toEqual([]);
  });

  it("keeps Pressure Index finite when ranks are incomplete", () => {
    const meters = pressureCrowdMeters([
      { rank: Number.NaN, lastRank: 1 },
      { rank: 2, lastRank: undefined },
      { rank: 3, lastRank: Number.NaN },
    ]);
    expect(Number.isFinite(meters.pressure)).toBe(true);
    expect(Number.isFinite(meters.crowd)).toBe(true);
    expect(meters.pressure).toBe(0);
    expect(meters.crowd).toBe(0);
  });

  it("raises pressure when live ranks move between polls", () => {
    const meters = pressureCrowdMeters([
      { rank: 1, lastRank: 4 },
      { rank: 4, lastRank: 1 },
    ]);
    expect(meters.rising).toBe(1);
    expect(meters.falling).toBe(1);
    expect(meters.pressure).toBeGreaterThan(0);
    expect(meters.crowd).toBe(100);
  });
});
