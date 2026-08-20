import "server-only";

import { unstable_cache } from "next/cache";
import { leagueRosterRows } from "@/lib/fpl";
import { getBootstrapStatic } from "@/lib/fpl";
import { isDatabaseConfigured } from "@/lib/db";
import { getLeagueSnapshot } from "@/lib/league/queries";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";

export type GwWinnerPerson = {
  entryId: number;
  name: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
};

export type GwWinnerCelebration = {
  gameweek: number;
  winnerPoints: number;
  /** Stable key for one-shot overlay per browser session. */
  celebrationKey: string;
  winners: GwWinnerPerson[];
};

/**
 * Slim celebration payload — uses league snapshot (no live picks fan-out)
 * and is cross-request cached so SiteShell does not rebuild the dashboard
 * on every signed-in navigation.
 */
async function computeActiveGwWinnerCelebration(): Promise<GwWinnerCelebration | null> {
  const [snapshot, bootstrap] = await Promise.all([
    getLeagueSnapshot(),
    getBootstrapStatic(),
  ]);

  if (snapshot.kind !== "ok") return null;

  const weeks = buildWeeklyGameweeks(
    leagueRosterRows(snapshot.data.standings),
    snapshot.data.bootstrap,
    snapshot.data.histories,
    snapshot.data.db.weekly,
  );
  const last = [...weeks].reverse().find((week) => week.finished) ?? null;
  if (!last || last.winnerEntryIds.length === 0) return null;

  const next = bootstrap.events.find((event) => event.id === last.gameweek + 1);
  if (next) {
    if (next.finished) return null;
    const deadlineMs = Date.parse(next.deadline_time);
    if (Number.isFinite(deadlineMs) && Date.now() >= deadlineMs) return null;
  }

  const byEntry = new Map(
    snapshot.data.db.managers
      .filter(
        (m): m is (typeof m) & { fplEntryId: number } => m.fplEntryId != null,
      )
      .map((m) => [m.fplEntryId, m]),
  );
  const rosterByEntry = new Map(
    leagueRosterRows(snapshot.data.standings).map((row) => [row.entry, row]),
  );

  const winners: GwWinnerPerson[] = last.winnerEntryIds.map((entryId, i) => {
    const stored = byEntry.get(entryId);
    const roster = rosterByEntry.get(entryId);
    const fallbackName = last.winnerNames[i] ?? `Entry ${entryId}`;
    return {
      entryId,
      name: stored?.displayName || roster?.player_name || fallbackName,
      avatarUrl: stored?.avatarUrl ?? null,
      supportedTeamId: stored?.supportedTeamId ?? null,
      supportedTeamCode: stored?.supportedTeamCode ?? null,
      avatarVariant: stored?.avatarVariant ?? 0,
    };
  });

  return {
    gameweek: last.gameweek,
    winnerPoints: last.winnerPoints,
    celebrationKey: `gw-winner-${last.gameweek}-${last.winnerEntryIds.join("-")}`,
    winners,
  };
}

const getCachedCelebration = unstable_cache(
  async (): Promise<GwWinnerCelebration | null> => {
    try {
      return await computeActiveGwWinnerCelebration();
    } catch {
      return null;
    }
  },
  ["gw-winner-celebration-v2"],
  { revalidate: 120, tags: ["celebration", "fpl"] },
);

/**
 * Active GW winner celebration: shown after a gameweek finishes with winners,
 * until the next gameweek's deadline (when that GW "starts").
 */
export async function getActiveGwWinnerCelebration(): Promise<GwWinnerCelebration | null> {
  if (!isDatabaseConfigured()) return null;
  return getCachedCelebration();
}
