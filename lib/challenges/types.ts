export const ACTING_MANAGER_COOKIE = "batch16_acting_manager_id";

export const CHALLENGE_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type ChallengeStatus =
  (typeof CHALLENGE_STATUS)[keyof typeof CHALLENGE_STATUS];

/** Activity points awarded when creating / accepting a challenge. */
export const CHALLENGE_ACTIVITY = {
  CREATE: 5,
  ACCEPT: 5,
} as const;

/** Stake (NPR) at or above this triggers the big full-time celebration. */
export const HIGH_STAKE_NPR = 1000;

export type ChallengeView = {
  id: number;
  description: string;
  stakeNpr: string | null;
  gameweek: number | null;
  status: string;
  creatorId: number;
  creatorName: string;
  opponentId: number;
  opponentName: string;
  winnerId: number | null;
  winnerName: string | null;
  createdAt: Date | string;
  resolvedAt: Date | string | null;
};

export function stakeAmount(stakeNpr: string | null): number {
  if (stakeNpr == null || stakeNpr === "") return 0;
  const n = Number(stakeNpr);
  return Number.isFinite(n) ? n : 0;
}

export function isHighStake(stakeNpr: string | null): boolean {
  return stakeAmount(stakeNpr) >= HIGH_STAKE_NPR;
}

export function parsePositiveInt(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function parseStakeNpr(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100_000, n));
}

/** Higher GW score wins. Tie or missing scores → admin must declare. */
export function winnerFromGwPoints(
  creatorPoints: number | null | undefined,
  opponentPoints: number | null | undefined,
  creatorId: number,
  opponentId: number,
): number | null {
  if (
    creatorPoints == null ||
    opponentPoints == null ||
    !Number.isFinite(creatorPoints) ||
    !Number.isFinite(opponentPoints) ||
    creatorPoints === opponentPoints
  ) {
    return null;
  }
  return creatorPoints > opponentPoints ? creatorId : opponentId;
}
