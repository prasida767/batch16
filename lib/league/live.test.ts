import { describe, expect, it } from "vitest";
import { rankDelta } from "@/lib/league/format";

describe("live standings helpers", () => {
  it("computes rank rise/fall for live table animations", () => {
    expect(rankDelta(1, 3)).toBeGreaterThan(0);
    expect(rankDelta(5, 2)).toBeLessThan(0);
    expect(rankDelta(4, 4)).toBe(0);
  });
});
