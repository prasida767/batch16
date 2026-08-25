import { describe, expect, it } from "vitest";
import { celebrationFromWinnerRows, isDbTrue } from "@/lib/league/winners";

describe("isDbTrue", () => {
  it("accepts common postgres/drizzle boolean encodings", () => {
    expect(isDbTrue(true)).toBe(true);
    expect(isDbTrue(1)).toBe(true);
    expect(isDbTrue("1")).toBe(true);
    expect(isDbTrue("t")).toBe(true);
    expect(isDbTrue("true")).toBe(true);
    expect(isDbTrue(false)).toBe(false);
    expect(isDbTrue(0)).toBe(false);
    expect(isDbTrue("f")).toBe(false);
    expect(isDbTrue(null)).toBe(false);
  });
});

describe("celebrationFromWinnerRows", () => {
  it("picks the latest gameweek with a flagged winner", () => {
    const view = celebrationFromWinnerRows([
      {
        gameweek: 1,
        isWinner: true,
        points: 88,
        entryId: 10,
        name: "Abhishek",
        avatarUrl: null,
        supportedTeamId: null,
        supportedTeamCode: null,
        avatarVariant: 0,
      },
      {
        gameweek: 1,
        isWinner: false,
        points: 40,
        entryId: 11,
        name: "Other",
        avatarUrl: null,
        supportedTeamId: null,
        supportedTeamCode: null,
        avatarVariant: 0,
      },
    ]);
    expect(view?.gameweek).toBe(1);
    expect(view?.winners.map((row) => row.name)).toEqual(["Abhishek"]);
    expect(view?.winnerPoints).toBe(88);
  });

  it("keeps winners even when FPL entry id is missing", () => {
    const view = celebrationFromWinnerRows([
      {
        gameweek: 1,
        isWinner: "t",
        points: 72,
        entryId: null,
        name: "Unlinked winner",
        avatarUrl: null,
        supportedTeamId: null,
        supportedTeamCode: null,
        avatarVariant: 1,
      },
    ]);
    expect(view).not.toBeNull();
    expect(view?.winners).toEqual([
      {
        entryId: null,
        name: "Unlinked winner",
        avatarUrl: null,
        supportedTeamId: null,
        supportedTeamCode: null,
        avatarVariant: 1,
      },
    ]);
  });

  it("returns null when nobody is flagged", () => {
    expect(
      celebrationFromWinnerRows([
        {
          gameweek: 1,
          isWinner: false,
          points: 10,
          entryId: 1,
          name: "A",
          avatarUrl: null,
          supportedTeamId: null,
          supportedTeamCode: null,
          avatarVariant: 0,
        },
      ]),
    ).toBeNull();
  });
});
