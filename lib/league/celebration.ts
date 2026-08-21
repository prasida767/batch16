import "server-only";

import { getBootstrapStatic } from "@/lib/fpl";
import { getDashboardData } from "@/lib/league/queries";
import { isDatabaseConfigured } from "@/lib/db";

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
 * Active GW winner celebration: shown after a gameweek finishes with winners,
 * until the next gameweek's deadline (when that GW "starts").
 */
export async function getActiveGwWinnerCelebration(): Promise<GwWinnerCelebration | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const [dashboard, bootstrap] = await Promise.all([
      getDashboardData(),
      getBootstrapStatic(),
    ]);

    if (dashboard.kind !== "ok") return null;
    const last = dashboard.data.lastWinner;
    if (!last?.finished || last.winnerEntryIds.length === 0) return null;

    const next = bootstrap.events.find((event) => event.id === last.gameweek + 1);
    if (next) {
      if (next.finished) return null;
      const deadlineMs = Date.parse(next.deadline_time);
      if (Number.isFinite(deadlineMs) && Date.now() >= deadlineMs) return null;
    }

    const byEntry = new Map(
      dashboard.data.standings.map((row) => [row.entryId, row]),
    );

    const winners: GwWinnerPerson[] = last.winnerEntryIds.map((entryId, i) => {
      const standing = byEntry.get(entryId);
      const fallbackName = last.winnerNames[i] ?? `Entry ${entryId}`;
      return {
        entryId,
        name: standing?.displayName ?? standing?.name ?? fallbackName,
        avatarUrl: standing?.avatarUrl ?? null,
        supportedTeamId: standing?.supportedTeamId ?? null,
        supportedTeamCode: standing?.supportedTeamCode ?? null,
        avatarVariant: standing?.avatarVariant ?? 0,
      };
    });

    return {
      gameweek: last.gameweek,
      winnerPoints: last.winnerPoints,
      celebrationKey: `gw-winner-${last.gameweek}-${last.winnerEntryIds.join("-")}`,
      winners,
    };
  } catch {
    return null;
  }
}
