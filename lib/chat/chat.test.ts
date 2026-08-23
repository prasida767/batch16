import { describe, expect, it } from "vitest";
import {
  capNewest,
  isChatMessageShape,
  maxPositiveId,
  pickQuoteOfWeek,
  shouldKeepOnRollover,
  upsertById,
} from "@/lib/chat/helpers";
import { HALL_OF_FAME_MIN_REACTIONS } from "@/lib/chat/types";
import { TAUNT_ACTIONS, tauntMeta } from "@/lib/chat/taunts";

describe("chat helpers", () => {
  it("finds the max id without spreading huge arrays", () => {
    const ids = Array.from({ length: 5000 }, (_, i) => i + 1);
    expect(maxPositiveId(ids)).toBe(5000);
    expect(maxPositiveId([])).toBe(0);
    expect(maxPositiveId([Number.NaN, -3, 0])).toBe(0);
  });

  it("caps the newest messages so the board stays bounded", () => {
    const rows = Array.from({ length: 12 }, (_, i) => ({ id: i + 1 }));
    expect(capNewest(rows, 5).map((r) => r.id)).toEqual([8, 9, 10, 11, 12]);
    const upserted = upsertById(rows, { id: 99 }, 5);
    expect(upserted.map((r) => r.id)).toEqual([9, 10, 11, 12, 99]);
  });

  it("keeps high-reaction and pinned messages on GW rollover", () => {
    expect(shouldKeepOnRollover({ reactionCount: HALL_OF_FAME_MIN_REACTIONS, pinned: false })).toBe(
      true,
    );
    expect(shouldKeepOnRollover({ reactionCount: 1, pinned: true })).toBe(true);
    expect(shouldKeepOnRollover({ reactionCount: 2, pinned: false })).toBe(false);
  });

  it("picks quote of the week from the highest-reacted keepable message", () => {
    expect(
      pickQuoteOfWeek([
        { id: 1, reactionCount: 1, pinned: false },
        { id: 2, reactionCount: 5, pinned: false },
        { id: 3, reactionCount: 5, pinned: true },
      ]),
    ).toBe(3);
    expect(pickQuoteOfWeek([{ id: 1, reactionCount: 0, pinned: false }])).toBeNull();
  });

  it("rejects malformed realtime payloads", () => {
    expect(isChatMessageShape(null)).toBe(false);
    expect(isChatMessageShape({ id: 1, managerId: 2, body: "hi" })).toBe(true);
    expect(isChatMessageShape({ id: "1", managerId: 2, body: "hi" })).toBe(false);
  });

  it("resolves taunt metadata for known actions", () => {
    expect(tauntMeta("slap").emoji).toBe("👋");
    expect(TAUNT_ACTIONS.length).toBeGreaterThan(3);
  });
});
