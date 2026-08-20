export const CHIP_LABELS: Record<string, string> = {
  wildcard: "Wildcard",
  freehit: "Free Hit",
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
  manager: "Assistant Manager",
};

export function chipLabel(chip: string | null | undefined): string | null {
  if (!chip) return null;
  return CHIP_LABELS[chip] ?? chip;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

export function rankDelta(rank: number, lastRank: number): number {
  if (!lastRank) return 0;
  return lastRank - rank;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Re-export — implementation lives in `@/lib/fpl/config` (safe for any runtime). */
export { getLeagueId } from "@/lib/fpl/config";

