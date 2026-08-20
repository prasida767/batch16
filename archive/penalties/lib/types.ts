import type { PenaltyDirection, PenaltyRoundRecord } from "@/lib/db/schema";

export const PENALTY_STATUS = {
  PENDING: "pending",
  ACTIVE: "active",
  COMPLETED: "completed",
  DECLINED: "declined",
  CANCELLED: "cancelled",
} as const;

export type PenaltyStatus =
  (typeof PENALTY_STATUS)[keyof typeof PENALTY_STATUS];

export const PENALTY_MODE = {
  SOLO: "solo",
  MULTIPLAYER: "multiplayer",
} as const;

export const PENALTY_PHASE = {
  CHOOSING: "choosing",
  REVEALING: "revealing",
  FINISHED: "finished",
} as const;

export const DIRECTIONS = ["left", "center", "right"] as const satisfies readonly PenaltyDirection[];

export const PENALTY_ACTIVITY = {
  PLAY: 2,
  WIN: 5,
  CHALLENGE: 3,
  ACCEPT: 2,
} as const;

export const PRESENCE_CHANNEL = "penalties-lobby";

export type { PenaltyDirection, PenaltyRoundRecord };

export type PenaltyMatchView = {
  id: number;
  mode: string;
  status: string;
  phase: string;
  challengerId: number;
  challengerName: string;
  challengerAvatar: string | null;
  opponentId: number | null;
  opponentName: string;
  opponentAvatar: string | null;
  challengerScore: number;
  opponentScore: number;
  winnerId: number | null;
  winnerName: string | null;
  currentRound: number;
  maxRounds: number;
  challengerChoice: PenaltyDirection | null;
  opponentChoice: PenaltyDirection | null;
  rounds: PenaltyRoundRecord[];
  createdAt: Date | string;
  completedAt: Date | string | null;
  /** Whose turn it is to shoot this round (null = CPU). */
  shooterId: number | null;
  /** Whose turn it is to dive this round (null = CPU). */
  keeperId: number | null;
};

export type PenaltyHistoryRow = {
  id: number;
  mode: string;
  opponentName: string;
  myScore: number;
  theirScore: number;
  winnerName: string | null;
  iWon: boolean;
  isDraw: boolean;
  createdAt: Date | string;
  completedAt: Date | string | null;
};

export type PenaltyLeaderboardRow = {
  managerId: number;
  displayName: string;
  avatarUrl: string | null;
  wins: number;
  losses: number;
  draws: number;
  gamesPlayed: number;
  winRate: number;
  rank: number;
};

export type PresencePayload = {
  managerId: number;
  displayName: string;
  avatarUrl: string | null;
  onlineAt: number;
};
