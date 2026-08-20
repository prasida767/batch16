/** Subset of FPL bootstrap-static — extend as new fields are needed. */
export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  average_entry_score: number;
  finished: boolean;
  data_checked: boolean;
  highest_scoring_entry: number | null;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
}

export interface FplTeam {
  id: number;
  name: string;
  short_name: string;
  code: number;
}

export interface FplElementType {
  id: number;
  plural_name: string;
  plural_name_short: string;
  singular_name: string;
  singular_name_short: string;
}

export interface FplElement {
  id: number;
  code: number;
  first_name: string;
  second_name: string;
  web_name: string;
  team: number;
  element_type: number;
  now_cost: number;
  selected_by_percent: string;
  total_points: number;
  event_points: number;
  form: string;
  status: string;
  news: string;
}

export interface FplBootstrapStatic {
  events: FplEvent[];
  teams: FplTeam[];
  element_types: FplElementType[];
  elements: FplElement[];
  total_players: number;
}

export interface FplClassicLeague {
  id: number;
  name: string;
  created: string;
  closed: boolean;
  max_entries: number | null;
  league_type: string;
  scoring: string;
  admin_entry: number | null;
  start_event: number;
  code_privacy: string;
  has_cup: boolean;
  cup_league: number | null;
  rank: number | null;
}

export interface FplLeagueStandingRow {
  id: number;
  event_total: number;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  total: number;
  entry: number;
  entry_name: string;
}

/** Managers who joined before standings exist (pre-season). */
export interface FplLeagueNewEntry {
  entry: number;
  entry_name: string;
  joined_time: string;
  player_first_name: string;
  player_last_name: string;
}

export interface FplClassicLeagueStandings {
  last_updated_data: string | null;
  league: FplClassicLeague;
  standings: {
    has_next: boolean;
    page: number;
    results: FplLeagueStandingRow[];
  };
  new_entries: {
    has_next: boolean;
    page: number;
    results: FplLeagueNewEntry[];
  };
}

export interface FplManagerEntry {
  id: number;
  joined_time: string;
  started_event: number;
  favourite_team: number | null;
  player_first_name: string;
  player_last_name: string;
  player_region_name: string;
  player_region_iso_code_short: string;
  summary_overall_points: number;
  summary_overall_rank: number | null;
  summary_event_points: number;
  summary_event_rank: number | null;
  current_event: number | null;
  name: string;
  name_change_blocked: boolean;
  last_deadline_bank: number;
  last_deadline_value: number;
  last_deadline_total_transfers: number;
}

export interface FplPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplAutomaticSub {
  entry: number;
  element_in: number;
  element_out: number;
  event: number;
}

export interface FplManagerPicks {
  active_chip: string | null;
  automatic_subs: FplAutomaticSub[];
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    rank: number | null;
    rank_sort: number | null;
    overall_rank: number | null;
    bank: number;
    value: number;
    event_transfers: number;
    event_transfers_cost: number;
    points_on_bench: number;
  };
  picks: FplPick[];
}

export interface FplLiveElementStats {
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;
  total_points: number;
  in_dreamteam: boolean;
}

export interface FplLiveElement {
  id: number;
  stats: FplLiveElementStats;
}

export interface FplLiveEvent {
  elements: FplLiveElement[];
}

export interface FplHistoryEvent {
  event: number;
  points: number;
  total_points: number;
  rank: number | null;
  rank_sort: number | null;
  overall_rank: number | null;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface FplChipPlay {
  name: string;
  time: string;
  event: number;
}

export interface FplPastSeason {
  season_name: string;
  total_points: number;
  rank: number;
}

export interface FplManagerHistory {
  current: FplHistoryEvent[];
  past: FplPastSeason[];
  chips: FplChipPlay[];
}

/** Fixture row from `/fixtures/` or `/fixtures/?event=N`. */
export interface FplFixture {
  id: number;
  code: number;
  event: number | null;
  finished: boolean;
  finished_provisional: boolean;
  kickoff_time: string | null;
  minutes: number;
  provisional_start_time: boolean;
  started: boolean;
  team_a: number;
  team_a_score: number | null;
  team_h: number;
  team_h_score: number | null;
  team_h_difficulty: number;
  team_a_difficulty: number;
}
