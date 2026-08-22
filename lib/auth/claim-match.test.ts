import { describe, expect, it } from "vitest";
import {
  editDistance,
  matchLeagueRoster,
  namesMatchForClaim,
  normalizeTeamName,
  parseClaimFormInput,
  parseEntryId,
  teamNamesMatch,
  validateClaimInputs,
  type LeagueRosterRow,
} from "@/lib/auth/claim-match";
import { isAdminEmail, getAdminEmails } from "@/lib/auth/admin";

const roster: LeagueRosterRow[] = [
  {
    entryId: 111,
    playerName: "Prasiddha Khadka",
    teamName: "Batch United",
    altNames: ["Prasidha Khadka"],
  },
  {
    entryId: 222,
    playerName: "Abhishek Gupta",
    teamName: "Gunners FC",
  },
  {
    entryId: 333,
    playerName: "Anil Lama",
    teamName: "The Himalayan XI",
  },
];

describe("claim matching", () => {
  it("requires at least one identifier", () => {
    expect(
      validateClaimInputs({ fullName: "", teamName: "", entryId: null }),
    ).toMatch(/team name|standings|entry ID/i);
    expect(
      validateClaimInputs({
        fullName: "Abhishek Gupta",
        teamName: "",
        entryId: null,
      }),
    ).toBeNull();
    expect(
      validateClaimInputs({
        fullName: "",
        teamName: "Batch United",
        entryId: null,
      }),
    ).toBeNull();
    expect(
      validateClaimInputs({ fullName: "", teamName: "", entryId: 111 }),
    ).toBeNull();
  });

  it("parses entry IDs from numbers and FPL URLs", () => {
    expect(parseEntryId("1234567")).toBe(1234567);
    expect(
      parseEntryId("https://fantasy.premierleague.com/entry/7654321/event/1"),
    ).toBe(7654321);
    expect(parseEntryId("not-an-id")).toBeNull();
  });

  it("matches names by canonical key, order, and compact form", () => {
    expect(namesMatchForClaim("Abhishek Gupta", "abhishek gupta")).toBe(true);
    expect(namesMatchForClaim("Abhishek Gupta", "Someone Else")).toBe(false);
    expect(namesMatchForClaim("Prasiddha Khadka", "Prasiddha")).toBe(true);
    expect(namesMatchForClaim("Prasiddha Khadka", "Khadka Prasiddha")).toBe(
      true,
    );
    expect(namesMatchForClaim("Prasiddha Khadka", "PrasiddhaKhadka")).toBe(
      true,
    );
    expect(namesMatchForClaim("Prasiddha Khadka", "P Khadka")).toBe(true);
    expect(namesMatchForClaim("Abhishek Gupta", "Abi")).toBe(false);
  });

  it("normalizes team names for comparison", () => {
    expect(normalizeTeamName("  Batch United!! ")).toBe(
      normalizeTeamName("batch united"),
    );
    expect(teamNamesMatch("Gunners FC", "Gunners")).toBe(true);
    expect(teamNamesMatch("The Gunners!!", "the gunners")).toBe(true);
    expect(teamNamesMatch("FC", "Arsenal FC")).toBe(false);
    expect(teamNamesMatch("Batch United", "Someone Else FC")).toBe(false);
    expect(editDistance("gunners", "guners")).toBe(1);
  });
});

describe("league roster matching", () => {
  it("matches a unique name or unique team name", () => {
    const byName = matchLeagueRoster(roster, {
      fullName: "prasiddha",
      teamName: "",
      entryId: null,
    });
    expect(byName).toEqual({ kind: "ok", row: roster[0] });

    const byTeam = matchLeagueRoster(roster, {
      fullName: "",
      teamName: "gunners",
      entryId: null,
    });
    expect(byTeam.kind).toBe("ok");
    if (byTeam.kind === "ok") expect(byTeam.row.entryId).toBe(222);
  });

  it("matches name + team together and explains mismatches", () => {
    const ok = matchLeagueRoster(roster, {
      fullName: "Abhishek Gupta",
      teamName: "Gunners FC",
      entryId: null,
    });
    expect(ok.kind).toBe("ok");

    const wrongTeam = matchLeagueRoster(roster, {
      fullName: "Abhishek Gupta",
      teamName: "Batch United",
      entryId: null,
    });
    expect(wrongTeam.kind).toBe("error");
    if (wrongTeam.kind === "error") {
      expect(wrongTeam.message).toMatch(/Gunners FC/i);
    }
  });

  it("accepts swapped name/team fields", () => {
    const swapped = matchLeagueRoster(roster, {
      fullName: "Batch United",
      teamName: "Prasiddha Khadka",
      entryId: null,
    });
    expect(swapped.kind).toBe("ok");
    if (swapped.kind === "ok") expect(swapped.row.entryId).toBe(111);
  });

  it("treats entry ID as authoritative when it is in the league", () => {
    const ok = matchLeagueRoster(roster, {
      fullName: "",
      teamName: "",
      entryId: 333,
    });
    expect(ok.kind).toBe("ok");
    if (ok.kind === "ok") expect(ok.row.playerName).toBe("Anil Lama");

    const missing = matchLeagueRoster(roster, {
      fullName: "",
      teamName: "",
      entryId: 999,
    });
    expect(missing.kind).toBe("error");
    if (missing.kind === "error") {
      expect(missing.message).toMatch(/not in this league/i);
    }
  });

  it("rejects an empty roster and unknown names", () => {
    expect(
      matchLeagueRoster([], {
        fullName: "Anyone",
        teamName: "",
        entryId: null,
      }).kind,
    ).toBe("error");

    const unknown = matchLeagueRoster(roster, {
      fullName: "Not In League",
      teamName: "",
      entryId: null,
    });
    expect(unknown.kind).toBe("error");
  });

  it("uses DB alt names (spelling variants)", () => {
    const variant = matchLeagueRoster(roster, {
      fullName: "Prasidha Khadka",
      teamName: "Batch United",
      entryId: null,
    });
    expect(variant.kind).toBe("ok");
  });

  it("asks for more detail when a name is ambiguous", () => {
    const twoAnils: LeagueRosterRow[] = [
      { entryId: 1, playerName: "Anil Lama", teamName: "A FC" },
      { entryId: 2, playerName: "Anil Sharma", teamName: "B FC" },
    ];
    const result = matchLeagueRoster(twoAnils, {
      fullName: "Anil",
      teamName: "",
      entryId: null,
    });
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toMatch(/several managers/i);
    }
  });
});

describe("claim form parsing", () => {
  it("promotes a numeric team field to entry ID", () => {
    expect(
      parseClaimFormInput({
        fullName: "Prasiddha",
        teamName: "111",
        entryIdRaw: "",
      }),
    ).toEqual({
      fullName: "Prasiddha",
      teamName: "",
      entryId: 111,
    });
  });
});

describe("admin allowlist", () => {
  it("denies when ADMIN_EMAILS is empty", () => {
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "";
    expect(getAdminEmails()).toEqual([]);
    expect(isAdminEmail("anyone@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = prev;
  });

  it("matches allowlisted emails case-insensitively", () => {
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "Admin@Example.com, other@test.com";
    expect(isAdminEmail("admin@example.com")).toBe(true);
    expect(isAdminEmail("nope@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = prev;
  });

  it("does not treat other league users as admin", () => {
    const prev = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "owner@example.com";
    expect(isAdminEmail("owner@example.com")).toBe(true);
    expect(isAdminEmail("teammate@example.com")).toBe(false);
    process.env.ADMIN_EMAILS = prev;
  });
});
