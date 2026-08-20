import type {
  FplClassicLeagueStandings,
  FplLeagueNewEntry,
  FplLeagueStandingRow,
} from "./types";

/**
 * League members for UI/sync.
 * Before the season starts FPL leaves `standings.results` empty and lists
 * joiners under `new_entries` instead — map those into standing-shaped rows.
 */
export function leagueRosterRows(
  standings: FplClassicLeagueStandings,
): FplLeagueStandingRow[] {
  if (standings.standings.results.length > 0) {
    return standings.standings.results;
  }

  const entries = [...standings.new_entries.results].sort((a, b) =>
    playerName(a).localeCompare(playerName(b), undefined, {
      sensitivity: "base",
    }),
  );

  return entries.map((row, index) => ({
    id: row.entry,
    event_total: 0,
    player_name: playerName(row),
    rank: index + 1,
    last_rank: index + 1,
    rank_sort: index + 1,
    total: 0,
    entry: row.entry,
    entry_name: row.entry_name,
  }));
}

function playerName(row: FplLeagueNewEntry): string {
  return `${row.player_first_name} ${row.player_last_name}`.trim();
}
