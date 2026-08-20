/**
 * Known activity action keys.
 * Add new keys here when wiring automatic awards later.
 */
export const ACTIVITY_ACTIONS = {
  MANUAL: "manual",
  WEEKLY_WIN: "weekly_win",
  SEASON_PRIZE: "season_prize",
  CHALLENGE: "challenge",
  CHALLENGE_CREATE: "challenge_create",
  CHALLENGE_ACCEPT: "challenge_accept",
  WALL_POST: "wall_post",
  DOCUMENTARY_RATE: "documentary_rate",
  BONUS: "bonus",
  PENALTY_PLAY: "penalty_play",
  PENALTY_WIN: "penalty_win",
  PENALTY_CHALLENGE: "penalty_challenge",
  PENALTY_ACCEPT: "penalty_accept",
} as const;

export type ActivityActionKey =
  (typeof ACTIVITY_ACTIONS)[keyof typeof ACTIVITY_ACTIONS] | (string & {});

export const ACTIVITY_PRIZE_SETTING_KEY = "activity_prize_display";

export type AwardActivityPointsInput = {
  managerId: number;
  /** Positive to award, negative to subtract. */
  delta: number;
  reason: string;
  actionKey?: ActivityActionKey;
};

export type ActivityLeaderboardRow = {
  managerId: number;
  fplEntryId: number | null;
  displayName: string;
  avatarUrl: string | null;
  activityPoints: number;
  rank: number;
};

export type ActivityEventRow = {
  id: number;
  managerId: number;
  managerName: string;
  delta: number;
  reason: string;
  actionKey: string;
  createdAt: Date;
};
