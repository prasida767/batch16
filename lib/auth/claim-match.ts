import { canonicalKeyFromName, slugifyName } from "@/lib/history/names";

/** Normalize FPL team / entry names for claim matching. */
export function normalizeTeamName(value: string): string {
  return slugifyName(value.trim());
}

/** True when two people names resolve to the same canonical key. */
export function namesMatchForClaim(a: string, b: string): boolean {
  const ka = canonicalKeyFromName(a);
  const kb = canonicalKeyFromName(b);
  return Boolean(ka && kb && ka === kb);
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
