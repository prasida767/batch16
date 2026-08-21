export {
  FPL_BASE_URL,
  FPL_CACHE,
  FPL_CACHE_TAGS,
  getFplBaseUrl,
  getLeagueId,
  requireLeagueId,
} from "./config";
export { FplApiError, isFplApiError } from "./errors";
export { fplFetch } from "./client";
export {
  // Preferred API
  getBootstrapStatic,
  getClassicLeagueStandings,
  getCurrentEvent,
  getCurrentGameweek,
  getLeagueStandings,
  getLiveGameweekData,
  getManagerEntry,
  getManagerHistory,
  getManagerPicks,
  getUpcomingFixtures,
  revalidateFplData,
  teamBadgeUrl,
  // Back-compat aliases
  fetchAllClassicLeagueStandings,
  fetchBootstrapStatic,
  fetchClassicLeagueStandings,
  fetchCurrentEvent,
  fetchLiveGameweek,
  fetchManagerEntry,
  fetchManagerHistory,
  fetchManagerPicks,
} from "./service";
export type {
  UpcomingFixtureTeam,
  UpcomingFixtureView,
  UpcomingGameweekFixtures,
} from "./service";
export { leagueRosterRows } from "./roster";
export type {
  FplAutomaticSub,
  FplBootstrapStatic,
  FplChipPlay,
  FplClassicLeague,
  FplClassicLeagueStandings,
  FplElement,
  FplElementType,
  FplEvent,
  FplFixture,
  FplHistoryEvent,
  FplLeagueNewEntry,
  FplLeagueStandingRow,
  FplLiveElement,
  FplLiveElementStats,
  FplLiveEvent,
  FplManagerEntry,
  FplManagerHistory,
  FplManagerPicks,
  FplPastSeason,
  FplPick,
  FplTeam,
} from "./types";
