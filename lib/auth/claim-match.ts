import { canonicalKeyFromName, slugifyName } from "@/lib/history/names";

export type LeagueRosterRow = {
  entryId: number;
  playerName: string;
  teamName: string;
  /** Extra names from our DB (display name spelling variants). */
  altNames?: string[];
};

export type ClaimInput = {
  fullName: string;
  teamName: string;
  entryId: number | null;
};

export type RosterMatch =
  | { kind: "ok"; row: LeagueRosterRow }
  | { kind: "error"; message: string };

/** Normalize FPL team / entry names for claim matching. */
export function normalizeTeamName(value: string): string {
  return slugifyName(value.trim());
}

/** FPL entry ID from a number or a pasted team URL. */
export function parseEntryId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(/\/entry\/(\d{1,10})/i);
  if (fromUrl) {
    const n = Number(fromUrl[1]);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  if (/^\d{1,10}$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isInteger(n) && n > 0 ? n : null;
  }
  return null;
}

function nameTokens(value: string): string[] {
  return slugifyName(value).split("_").filter(Boolean);
}

function compactName(value: string): string {
  return nameTokens(value).join("");
}

function sameTokenSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const other = [...b].sort();
  return [...a].sort().every((token, index) => token === other[index]);
}

function tokensCoveredBy(short: string[], long: string[]): boolean {
  if (short.length === 0) return false;
  return short.every((token) => long.includes(token));
}

/** Levenshtein distance, capped so we only use it on short slugs. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const cur = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        (prev[j] ?? 99) + 1,
        (cur[j - 1] ?? 99) + 1,
        (prev[j - 1] ?? 99) + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = cur[j] ?? 99;
  }
  return prev[b.length] ?? 99;
}

function initialPlusLast(short: string[], long: string[]): boolean {
  if (short.length !== 2 || long.length < 2) return false;
  const [first, last] = short;
  if (!first || !last || first.length !== 1 || last.length < 3) return false;
  return long[0]!.startsWith(first) && long[long.length - 1] === last;
}

/**
 * True when two people names refer to the same manager.
 * Accepts case, punctuation, token order, compacted names, and
 * a unique first name / last name that already appears in the stored name.
 */
export function namesMatchForClaim(a: string, b: string): boolean {
  const ka = canonicalKeyFromName(a);
  const kb = canonicalKeyFromName(b);
  if (ka && kb && ka === kb) return true;

  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  if (sameTokenSet(ta, tb)) return true;

  const ca = compactName(a);
  const cb = compactName(b);
  if (ca.length >= 6 && ca === cb) return true;

  if (initialPlusLast(ta, tb) || initialPlusLast(tb, ta)) return true;

  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (!tokensCoveredBy(shorter, longer)) return false;
  if (shorter.length >= 2) return true;
  const token = shorter[0]!;
  return token.length >= 3;
}

function personMatchesRow(row: LeagueRosterRow, fullName: string): boolean {
  if (!fullName.trim()) return false;
  const names = [row.playerName, ...(row.altNames ?? [])];
  return names.some((name) => namesMatchForClaim(name, fullName));
}

/** True when two FPL team names are the same after punctuation / FC noise. */
export function teamNamesMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const stripThe = (value: string) => value.replace(/^the_/, "");
  const stripFc = (value: string) => value.replace(/_+(fc|afc)$/g, "");
  const sa = stripFc(stripThe(na));
  const sb = stripFc(stripThe(nb));
  if (sa && sb && sa === sb) return true;

  const shorter = sa.length <= sb.length ? sa : sb;
  const longer = sa.length <= sb.length ? sb : sa;
  if (shorter.length < 5) return false;
  return longer.includes(shorter);
}

function closeTeamMatch(row: LeagueRosterRow, typed: string): boolean {
  if (teamNamesMatch(row.teamName, typed)) return true;
  const a = normalizeTeamName(row.teamName);
  const b = normalizeTeamName(typed);
  if (a.length < 6 || b.length < 6) return false;
  return editDistance(a, b) <= 1;
}

function uniqueOrNull<T>(rows: T[]): T | null {
  return rows.length === 1 ? rows[0]! : null;
}

/** Pull an FPL entry ID out of the dedicated field, team name, or name. */
export function parseClaimFormInput(args: {
  fullName: string;
  teamName: string;
  entryIdRaw: string;
}): ClaimInput {
  const fullName = args.fullName.trim();
  const teamName = args.teamName.trim();
  const digitsOnly = (value: string) => /^\d{1,10}$/.test(value);
  const entryId =
    parseEntryId(args.entryIdRaw) ??
    parseEntryId(teamName) ??
    parseEntryId(fullName);

  return {
    fullName: digitsOnly(fullName) ? "" : fullName,
    teamName: digitsOnly(teamName) ? "" : teamName,
    entryId,
  };
}

/**
 * Validate claim inputs before hitting FPL / DB.
 * At least one of name, team name, or entry ID is required.
 */
export function validateClaimInputs(args: {
  fullName: string;
  teamName: string;
  entryId?: number | null;
}): string | null {
  const fullName = args.fullName.trim();
  const teamName = args.teamName.trim();
  const entryId = args.entryId ?? parseEntryId(teamName) ?? parseEntryId(fullName);
  if (!fullName && !teamName && entryId == null) {
    return "Enter your FPL team name, the name from the standings, or your FPL entry ID.";
  }
  if (fullName && !canonicalKeyFromName(fullName) && parseEntryId(fullName) == null) {
    return "That name doesn't look valid.";
  }
  return null;
}

/**
 * Match user input against the live FPL league roster.
 * Entry ID is authoritative when present; otherwise name and/or team name
 * must uniquely identify one manager in the league.
 */
export function matchLeagueRoster(
  roster: LeagueRosterRow[],
  input: ClaimInput,
): RosterMatch {
  if (roster.length === 0) {
    return {
      kind: "error",
      message:
        "This league has no FPL managers to match yet. Ask an admin to sync the roster.",
    };
  }

  if (input.entryId != null) {
    const row = roster.find((item) => item.entryId === input.entryId);
    if (!row) {
      return {
        kind: "error",
        message: `FPL entry ${input.entryId} is not in this league. Copy the number from your FPL team URL (fantasy.premierleague.com/entry/XXXXXX/).`,
      };
    }
    return { kind: "ok", row };
  }

  const nameHits = input.fullName
    ? roster.filter((row) => personMatchesRow(row, input.fullName))
    : [];
  const teamHits = input.teamName
    ? roster.filter((row) => closeTeamMatch(row, input.teamName))
    : [];

  if (input.fullName && input.teamName) {
    const both = roster.filter(
      (row) =>
        personMatchesRow(row, input.fullName) &&
        closeTeamMatch(row, input.teamName),
    );
    const uniqueBoth = uniqueOrNull(both);
    if (uniqueBoth) return { kind: "ok", row: uniqueBoth };

    const swapped = roster.filter(
      (row) =>
        personMatchesRow(row, input.teamName) &&
        closeTeamMatch(row, input.fullName),
    );
    const uniqueSwapped = uniqueOrNull(swapped);
    if (uniqueSwapped) return { kind: "ok", row: uniqueSwapped };

    if (both.length > 1 || swapped.length > 1) {
      return {
        kind: "error",
        message:
          "Several managers matched. Add your FPL entry ID from your team URL.",
      };
    }

    const uniqueName = uniqueOrNull(nameHits);
    if (uniqueName) {
      return {
        kind: "error",
        message: `Found ${uniqueName.playerName}, but their FPL team is “${uniqueName.teamName}”, not “${input.teamName}”.`,
      };
    }
    const uniqueTeam = uniqueOrNull(teamHits);
    if (uniqueTeam) {
      return {
        kind: "error",
        message: `“${uniqueTeam.teamName}” belongs to ${uniqueTeam.playerName}, which doesn't match the name you entered.`,
      };
    }
    if (nameHits.length === 0 && teamHits.length === 0) {
      return {
        kind: "error",
        message:
          "No manager in this league matched that name or team. Use the standings spelling, or paste your FPL entry ID.",
      };
    }
    return {
      kind: "error",
      message:
        "Couldn't uniquely match that name and team. Paste your FPL entry ID from fantasy.premierleague.com/entry/XXXXXX/.",
    };
  }

  if (input.fullName) {
    const unique = uniqueOrNull(nameHits);
    if (unique) return { kind: "ok", row: unique };
    if (nameHits.length === 0) {
      return {
        kind: "error",
        message:
          "No manager in this league matched that name. Use the name from the standings, or add your FPL team name / entry ID.",
      };
    }
    return {
      kind: "error",
      message:
        "Several managers match that name. Add your FPL team name or entry ID.",
    };
  }

  if (input.teamName) {
    const unique = uniqueOrNull(teamHits);
    if (unique) return { kind: "ok", row: unique };
    if (teamHits.length === 0) {
      return {
        kind: "error",
        message:
          "No FPL team in this league matched that name. Copy it from the league table, or paste your FPL entry ID.",
      };
    }
    return {
      kind: "error",
      message:
        "Several teams match that name. Add your name from the standings or your FPL entry ID.",
    };
  }

  return {
    kind: "error",
    message:
      "Enter your FPL team name, the name from the standings, or your FPL entry ID.",
  };
}
