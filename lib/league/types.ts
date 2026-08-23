import type { PrizeConfigFormValues } from "@/lib/prizes";
import type { FplChipPlay, FplHistoryEvent, FplPastSeason } from "@/lib/fpl";

export type LeagueStatus =
  | { kind: "ok" }
  | { kind: "no_league" }
  | { kind: "error"; message: string };

export type SquadPlayer = {
  elementId: number;
  webName: string;
  teamShort: string;
  pickPosition: number;
  elementType: number;
  positionShort: string;
  isCaptain: boolean;
  isVice: boolean;
  multiplier: number;
  points: number;
  minutes: number;
  isBench: boolean;
};

export type ManagerStanding = {
  entryId: number;
  managerId: number | null;
  name: string;
  displayName: string;
  teamName: string;
  avatarUrl: string | null;
  supportedTeamId: number | null;
  supportedTeamCode: number | null;
  avatarVariant: number;
  rank: number;
  lastRank: number;
  totalPoints: number;
  eventPoints: number;
  livePoints: number | null;
  balance: number;
  entryFeePaid: boolean;
  /** True when the manager has registered and claimed this FPL seat. */
  verified: boolean;
  weeksWon: number;
  activityPoints: number;
};

export type WeeklyManagerScore = {
  entryId: number;
  name: string;
  teamName: string;
  points: number;
  rank: number;
  isWinner: boolean;
};

export type WeeklyGameweek = {
  gameweek: number;
  finished: boolean;
  isCurrent: boolean;
  winnerNames: string[];
  winnerEntryIds: number[];
  winnerPoints: number;
  rows: WeeklyManagerScore[];
  /** True when winners were taken from `weekly_results` rather than FPL auto. */
  manuallySet?: boolean;
};

export type LedgerRow = {
  entryId: number;
  name: string;
  teamName: string;
  rank: number;
  weeksWon: number;
  entryFee: number;
  entryFeePaid: boolean;
  weeklyWinnings: number;
  seasonPrize: number;
  computedBalance: number;
  recordedBalance: number | null;
  balance: number;
};

export type Settlement = {
  fromEntryId: number;
  fromName: string;
  toEntryId: number;
  toName: string;
  amount: number;
};

export type BalanceEvent = {
  label: string;
  gameweek: number | null;
  amount: number;
  running: number;
};

export type PrizeSnapshot = PrizeConfigFormValues & {
  entryFeeNum: number;
  weeklyWinnerNum: number;
  overall1stNum: number;
  overall2ndNum: number;
  lastPlaceNum: number;
  customPrizesTotalNum: number;
};

export type LeagueMeta = {
  leagueId: number;
  leagueName: string;
  currentEventId: number | null;
  currentEventName: string | null;
  isLive: boolean;
  isProvisional: boolean;
  seasonComplete: boolean;
  lastUpdated: string | null;
};

/** Lightweight payload for match-day polling (no full ledger/history). */
export type LiveStandingUpdate = {
  entryId: number;
  playerName: string;
  teamName: string;
  rank: number;
  lastRank: number;
  totalPoints: number;
  eventPoints: number;
  livePoints: number | null;
};

export type LiveManagerScorer = {
  entryId: number;
  playerName: string;
  teamName: string;
  points: number;
};

export type LivePlayerScorer = {
  elementId: number;
  name: string;
  teamId: number;
  points: number;
  ownedBy: number;
};

export type LiveStandingsPayload = {
  isLive: boolean;
  isProvisional: boolean;
  /** True when FPL /event/{id}/live returned usable stats this request. */
  liveStatsReady: boolean;
  leagueName: string;
  currentEventId: number | null;
  currentEventName: string | null;
  nextEventName: string | null;
  nextDeadline: string | null;
  fetchedAt: string;
  standings: LiveStandingUpdate[];
  /** Highest GW points among managers this gameweek. */
  topScorers: LiveManagerScorer[];
  /** Highest-scoring players owned in starting XIs across the league. */
  playerScorers: LivePlayerScorer[];
};

export type DashboardData = {
  meta: LeagueMeta;
  prize: PrizeSnapshot;
  standings: ManagerStanding[];
  pot: number;
  weeklyPaid: number;
  seasonReserved: number;
  remaining: number;
  owed: LedgerRow[];
  owes: LedgerRow[];
  lastWinner: WeeklyGameweek | null;
};

export type ManagerDetail = {
  meta: LeagueMeta;
  prize: PrizeSnapshot;
  standing: ManagerStanding | null;
  entryId: number;
  playerName: string;
  teamName: string;
  region: string | null;
  overallRank: number | null;
  eventPoints: number;
  totalPoints: number;
  bank: number;
  squadValue: number;
  eventId: number | null;
  eventName: string | null;
  activeChip: string | null;
  chips: FplChipPlay[];
  starters: SquadPlayer[];
  bench: SquadPlayer[];
  formation: string;
  history: FplHistoryEvent[];
  pastSeasons: FplPastSeason[];
  balanceEvents: BalanceEvent[];
  balance: number;
  activityPoints: number;
};
