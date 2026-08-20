import "server-only";

import { cache } from "react";
import { getWeeklyResultsData } from "@/lib/league/queries";
import {
  buildRivalriesBoard,
  rivalryForManager,
  type RivalriesBoard,
  type RivalryManager,
} from "@/lib/rivalries/compute";

export const getRivalriesBoard = cache(async (): Promise<
  | { kind: "ok"; board: RivalriesBoard }
  | { kind: "no_league" }
  | { kind: "error"; message: string }
  | { kind: "empty"; message: string }
> => {
  const data = await getWeeklyResultsData();
  if (data.kind !== "ok") return data;

  const finished = data.weeks.filter((w) => w.finished);
  if (finished.length < 1) {
    return {
      kind: "empty",
      message: "Rivalries unlock once at least one gameweek has finished.",
    };
  }

  const managers: RivalryManager[] = data.standings.map((row) => ({
    entryId: row.entryId,
    displayName: row.displayName,
    supportedTeamId: row.supportedTeamId,
    supportedTeamCode: row.supportedTeamCode,
    avatarVariant: row.avatarVariant,
  }));

  const board = buildRivalriesBoard(data.weeks, managers);
  return { kind: "ok", board };
});

export async function getManagerRivalryProfile(entryId: number) {
  const result = await getRivalriesBoard();
  if (result.kind !== "ok") return null;
  return rivalryForManager(result.board, entryId);
}

export type { RivalriesBoard, RivalryManager } from "@/lib/rivalries/compute";
