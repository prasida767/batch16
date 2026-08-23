import type { ManagerStanding } from "@/lib/league/types";

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Rank 0 / missing ranks (pre-season) sort after real positions. */
export function effectiveRank(rank: number): number {
  return rank > 0 ? rank : Number.MAX_SAFE_INTEGER;
}

export function compareStandings(
  a: Pick<
    ManagerStanding,
    "rank" | "totalPoints" | "eventPoints" | "displayName" | "name"
  >,
  b: Pick<
    ManagerStanding,
    "rank" | "totalPoints" | "eventPoints" | "displayName" | "name"
  >,
): number {
  const rankDiff = effectiveRank(a.rank) - effectiveRank(b.rank);
  if (rankDiff !== 0) return rankDiff;
  if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
  if (b.eventPoints !== a.eventPoints) return b.eventPoints - a.eventPoints;
  const nameA = a.displayName || a.name || "";
  const nameB = b.displayName || b.name || "";
  return nameA.localeCompare(nameB, undefined, { sensitivity: "base" });
}

function displayLabel(
  displayName: string | null | undefined,
  name: string | null | undefined,
  entryId: number,
): string {
  const label = (displayName || name || "").trim();
  return label || `Entry ${entryId}`;
}

/**
 * Drop invalid rows, fill missing numbers, and sort by FPL rank.
 * Safe to call with empty or partial live payloads.
 */
export function sanitizeStandings(rows: ManagerStanding[]): ManagerStanding[] {
  const cleaned = rows
    .filter((row) => Number.isFinite(row.entryId) && row.entryId > 0)
    .map((row) => {
      const totalPoints = finiteNumber(row.totalPoints);
      const eventPoints = finiteNumber(row.eventPoints);
      const rank = finiteNumber(row.rank);
      const lastRank = finiteNumber(row.lastRank) || rank;
      return {
        ...row,
        name: displayLabel(row.name, row.displayName, row.entryId),
        displayName: displayLabel(row.displayName, row.name, row.entryId),
        teamName: (row.teamName || "").trim() || "—",
        rank,
        lastRank,
        totalPoints,
        eventPoints,
        livePoints:
          row.livePoints != null && Number.isFinite(row.livePoints)
            ? row.livePoints
            : null,
        balance: finiteNumber(row.balance),
        weeksWon: Math.max(0, finiteNumber(row.weeksWon)),
        activityPoints: Math.max(0, finiteNumber(row.activityPoints)),
        verified: Boolean(row.verified),
        avatarVariant: finiteNumber(row.avatarVariant),
      } satisfies ManagerStanding;
    })
    .sort(compareStandings);

  const needsRanks = cleaned.every((row) => row.rank <= 0);
  if (!needsRanks) return cleaned;

  return cleaned.map((row, index) => ({
    ...row,
    rank: index + 1,
    lastRank: row.lastRank > 0 ? row.lastRank : index + 1,
  }));
}

/** Merge a live poll into the current table without dropping known managers. */
export function mergeLiveStandings(
  current: ManagerStanding[],
  live: Array<{
    entryId: number;
    playerName: string;
    teamName: string;
    rank: number;
    lastRank: number;
    totalPoints: number;
    eventPoints: number;
    livePoints: number | null;
  }>,
): ManagerStanding[] {
  const byEntry = new Map(current.map((row) => [row.entryId, row]));
  const seen = new Set<number>();

  const updated: ManagerStanding[] = live.flatMap((item) => {
    if (!Number.isFinite(item.entryId) || item.entryId <= 0) return [];
    seen.add(item.entryId);
    const prev = byEntry.get(item.entryId);
    if (!prev) {
      return [
        {
          entryId: item.entryId,
          managerId: null,
          name: item.playerName || `Entry ${item.entryId}`,
          displayName: item.playerName || `Entry ${item.entryId}`,
          teamName: item.teamName || "",
          avatarUrl: null,
          supportedTeamId: null,
          supportedTeamCode: null,
          avatarVariant: 0,
          rank: item.rank,
          lastRank: item.lastRank,
          totalPoints: item.totalPoints,
          eventPoints: item.eventPoints,
          livePoints: item.livePoints,
          balance: 0,
          entryFeePaid: false,
          verified: false,
          weeksWon: 0,
          activityPoints: 0,
        } satisfies ManagerStanding,
      ];
    }
    return [
      {
        ...prev,
        rank: item.rank,
        lastRank: item.lastRank,
        totalPoints: item.totalPoints,
        eventPoints: item.eventPoints,
        livePoints: item.livePoints,
        ...(item.playerName
          ? { name: item.playerName, displayName: item.playerName }
          : {}),
        ...(item.teamName ? { teamName: item.teamName } : {}),
      },
    ];
  });

  for (const row of current) {
    if (!seen.has(row.entryId)) updated.push(row);
  }

  return sanitizeStandings(updated);
}
