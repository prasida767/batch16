import "server-only";

import { cache } from "react";
import { leagueRosterRows } from "@/lib/fpl";
import { getLeagueBoard, getLeagueSnapshot } from "@/lib/league/queries";
import {
  buildWeeklyGameweeks,
  buildWeeklyGameweeksFromStored,
} from "@/lib/league/weekly";
import { isFplGameweekSettled } from "@/lib/league/winners";
import type { WeeklyGameweek } from "@/lib/league/types";
import {
  buildRivalriesBoard,
  rivalryForManager,
  type RivalriesBoard,
  type RivalryManager,
} from "@/lib/rivalries/compute";

function managersFromBoard(
  standings: ReturnType<typeof leagueRosterRows>,
  dbManagers: Array<{
    fplEntryId: number | null;
    displayName: string;
    supportedTeamId: number | null;
    supportedTeamCode: number | null;
    avatarVariant: number;
  }>,
): RivalryManager[] {
  const stored = new Map(
    dbManagers
      .filter(
        (manager): manager is typeof manager & { fplEntryId: number } =>
          manager.fplEntryId != null,
      )
      .map((manager) => [manager.fplEntryId, manager]),
  );

  return standings.flatMap((row) => {
    if (!Number.isFinite(row.entry) || row.entry <= 0) return [];
    const manager = stored.get(row.entry);
    return [
      {
        entryId: row.entry,
        displayName:
          manager?.displayName || row.player_name || `Entry ${row.entry}`,
        supportedTeamId: manager?.supportedTeamId ?? null,
        supportedTeamCode: manager?.supportedTeamCode ?? null,
        avatarVariant: manager?.avatarVariant ?? 0,
      },
    ];
  });
}

/** Stored weeks are usable for H2H once FPL has settled, even without declared winners. */
function markSettledWeeks(
  weeks: WeeklyGameweek[],
  bootstrap: { events: Array<{ id: number; finished: boolean; data_checked: boolean }> },
): WeeklyGameweek[] {
  return weeks.map((week) => {
    const event = bootstrap.events.find((item) => item.id === week.gameweek);
    return {
      ...week,
      finished: week.finished || isFplGameweekSettled(event),
    };
  });
}

function hasHeadToHead(weeks: WeeklyGameweek[]) {
  return weeks.some((week) => week.finished && week.rows.length >= 2);
}

export const getRivalriesBoard = cache(async (): Promise<
  | { kind: "ok"; board: RivalriesBoard }
  | { kind: "no_league" }
  | { kind: "error"; message: string }
  | { kind: "empty"; message: string }
> => {
  try {
    const board = await getLeagueBoard();
    if (board.kind !== "ok") return board;

    const roster = leagueRosterRows(board.data.standings);
    const managers = managersFromBoard(roster, board.data.db.managers);

    let weeks = markSettledWeeks(
      buildWeeklyGameweeksFromStored(roster, board.data.db.weekly),
      board.data.bootstrap,
    );

    if (!hasHeadToHead(weeks)) {
      const snapshot = await getLeagueSnapshot();
      if (snapshot.kind === "ok") {
        weeks = buildWeeklyGameweeks(
          roster,
          snapshot.data.bootstrap,
          snapshot.data.histories,
          snapshot.data.db.weekly,
        );
      }
    }

    if (!hasHeadToHead(weeks) || managers.length < 2) {
      return {
        kind: "empty",
        message: "Rivalries unlock once at least one gameweek has finished.",
      };
    }

    return {
      kind: "ok",
      board: buildRivalriesBoard(weeks, managers),
    };
  } catch (error) {
    console.error("[rivalries] Board failed", error);
    return {
      kind: "error",
      message:
        error instanceof Error ? error.message : "Couldn't load rivalries.",
    };
  }
});

export async function getManagerRivalryProfile(entryId: number) {
  const result = await getRivalriesBoard();
  if (result.kind !== "ok") return null;
  return rivalryForManager(result.board, entryId);
}

export type { RivalriesBoard, RivalryManager } from "@/lib/rivalries/compute";
