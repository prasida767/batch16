import { canonicalKeyFromName, slugifyName } from "@/lib/history/names";

/** Normalize FPL team / entry names for claim matching. */
export function normalizeTeamName(value: string): string {
  return slugifyName(value.trim());
}

function nameTokens(value: string): string[] {
  return slugifyName(value).split("_").filter(Boolean);
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

/**
 * True when two people names refer to the same manager.
 * Accepts case, punctuation, token order, and a unique first name
 * that already appears in the stored full name.
 */
export function namesMatchForClaim(a: string, b: string): boolean {
  const ka = canonicalKeyFromName(a);
  const kb = canonicalKeyFromName(b);
  if (ka && kb && ka === kb) return true;

  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.length === 0 || tb.length === 0) return false;
  if (sameTokenSet(ta, tb)) return true;

  const [shorter, longer] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (!tokensCoveredBy(shorter, longer)) return false;
  if (shorter.length >= 2) return true;
  const token = shorter[0]!;
  return token.length >= 3;
}

/** True when two FPL team names are the same after punctuation / FC noise. */
export function teamNamesMatch(a: string, b: string): boolean {
  const na = normalizeTeamName(a);
  const nb = normalizeTeamName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const strippedA = na.replace(/_+(fc|afc)$/g, "");
  const strippedB = nb.replace(/_+(fc|afc)$/g, "");
  if (strippedA && strippedB && strippedA === strippedB) return true;

  const shorter = na.length <= nb.length ? na : nb;
  const longer = na.length <= nb.length ? nb : na;
  if (shorter.length < 5) return false;
  return longer.includes(shorter);
}

/**
 * Validate claim inputs before hitting FPL / DB.
 * Returns an error message or null when inputs look usable.
 */
export function validateClaimInputs(args: {
  fullName: string;
  teamName: string;
}): string | null {
  const fullName = args.fullName.trim();
  const teamName = args.teamName.trim();
  if (!fullName || !teamName) {
    return "Enter your name and FPL team name exactly as shown in the league.";
  }
  if (!canonicalKeyFromName(fullName)) {
    return "That name doesn't look valid.";
  }
  return null;
}
