import { describe, expect, it } from "vitest";
import {
  CHALLENGE_STATUS,
  isHighStake,
  parsePositiveInt,
  parseStakeNpr,
  stakeAmount,
  winnerFromGwPoints,
} from "@/lib/challenges/types";
import { isDocumentaryWeekEligible } from "@/lib/documentary/eligibility";
import { formatTimeAgo } from "@/lib/notifications/time-ago";
import { resolveMentionedManagerIds } from "@/lib/notifications/mentions";
import { distributeSeats } from "@/lib/chat/seating";

describe("Baaji stake helpers", () => {
  it("parses stake amounts", () => {
    expect(stakeAmount(null)).toBe(0);
    expect(stakeAmount("500")).toBe(500);
    expect(stakeAmount("not-a-number")).toBe(0);
  });

  it("flags high stakes at 1000 NPR", () => {
    expect(isHighStake("999")).toBe(false);
    expect(isHighStake("1000")).toBe(true);
  });

  it("parses form ids and stakes, rejecting invalid data", () => {
    expect(parsePositiveInt("12")).toBe(12);
    expect(parsePositiveInt("")).toBeNull();
    expect(parsePositiveInt("nope")).toBeNull();
    expect(parsePositiveInt(0)).toBeNull();
    expect(parseStakeNpr("500")).toBe(500);
    expect(parseStakeNpr("abc")).toBeNull();
    expect(parseStakeNpr("")).toBeNull();
    expect(parseStakeNpr("999999")).toBe(100_000);
  });

  it("picks a GW winner and leaves ties for admin", () => {
    expect(winnerFromGwPoints(40, 12, 1, 2)).toBe(1);
    expect(winnerFromGwPoints(10, 22, 1, 2)).toBe(2);
    expect(winnerFromGwPoints(18, 18, 1, 2)).toBeNull();
    expect(winnerFromGwPoints(null, 20, 1, 2)).toBeNull();
    expect(winnerFromGwPoints(Number.NaN, 8, 1, 2)).toBeNull();
  });

  it("exposes challenge status machine values used by create/accept/resolve", () => {
    expect(CHALLENGE_STATUS.PENDING).toBe("pending");
    expect(CHALLENGE_STATUS.ACCEPTED).toBe("accepted");
    expect(CHALLENGE_STATUS.DECLINED).toBe("declined");
    expect(CHALLENGE_STATUS.COMPLETED).toBe("completed");
  });
});

describe("documentary eligibility", () => {
  it("rejects unfinished or zero-point weeks", () => {
    expect(
      isDocumentaryWeekEligible({
        finished: false,
        rows: [{ points: 50 } as never],
      }),
    ).toBe(false);
    expect(
      isDocumentaryWeekEligible({
        finished: true,
        rows: [{ points: 0 } as never, { points: 0 } as never],
      }),
    ).toBe(false);
  });

  it("accepts finished weeks with real scores", () => {
    expect(
      isDocumentaryWeekEligible({
        finished: true,
        rows: [{ points: 12 } as never, { points: 0 } as never],
      }),
    ).toBe(true);
  });
});

describe("notifications + chat", () => {
  it("formats relative times", () => {
    const now = Date.parse("2026-08-20T12:00:00.000Z");
    expect(formatTimeAgo("2026-08-20T11:59:30.000Z", now)).toBe("just now");
    expect(formatTimeAgo("2026-08-20T11:00:00.000Z", now)).toBe("1 hour ago");
  });

  it("resolves @mentions from roster display names", () => {
    const roster = [
      { id: 1, displayName: "Abhishek Gupta" },
      { id: 2, displayName: "Prasiddha Khadka" },
    ];
    expect(
      resolveMentionedManagerIds("Nice one @Abhishek", roster, 2),
    ).toEqual([1]);
    expect(
      resolveMentionedManagerIds("@Prasiddha see this", roster, 1),
    ).toEqual([2]);
    expect(resolveMentionedManagerIds("no mentions", roster, 1)).toEqual([]);
  });

  it("distributes dressing-room seats around the room", () => {
    const roster = Array.from({ length: 8 }, (_, i) => ({
      managerId: i + 1,
      displayName: `M${i + 1}`,
      avatarUrl: null,
      supportedTeamId: null,
      supportedTeamCode: null,
      avatarVariant: 0,
      verified: i % 2 === 0,
    }));
    const layout = distributeSeats(roster);
    const total =
      layout.top.length +
      layout.right.length +
      layout.bottom.length +
      layout.left.length;
    expect(total).toBe(8);
  });
});
