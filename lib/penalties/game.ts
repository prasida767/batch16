import type { PenaltyDirection, PenaltyRoundRecord } from "@/lib/db/schema";
import { DIRECTIONS } from "@/lib/penalties/types";

export function isGoal(shot: PenaltyDirection, dive: PenaltyDirection) {
  return shot !== dive;
}

export function randomDirection(): PenaltyDirection {
  return DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)]!;
}

/** Odd rounds (1,3,5): challenger shoots. Even: opponent shoots. */
export function rolesForRound(
  round: number,
  challengerId: number,
  opponentId: number | null,
): { shooterId: number | null; keeperId: number | null } {
  const challengerShoots = round % 2 === 1;
  if (challengerShoots) {
    return { shooterId: challengerId, keeperId: opponentId };
  }
  return { shooterId: opponentId, keeperId: challengerId };
}

export function canEndEarly(
  round: number,
  maxRounds: number,
  a: number,
  b: number,
): boolean {
  const remaining = maxRounds - round;
  return Math.abs(a - b) > remaining;
}

export function resolveWinnerIds(args: {
  challengerId: number;
  opponentId: number | null;
  challengerScore: number;
  opponentScore: number;
}): number | null {
  if (args.challengerScore === args.opponentScore) return null;
  if (args.challengerScore > args.opponentScore) return args.challengerId;
  return args.opponentId;
}

export function buildRound(args: {
  round: number;
  shooterId: number | null;
  keeperId: number | null;
  shot: PenaltyDirection;
  dive: PenaltyDirection;
}): PenaltyRoundRecord {
  return {
    round: args.round,
    shooterId: args.shooterId,
    keeperId: args.keeperId,
    shot: args.shot,
    dive: args.dive,
    scored: isGoal(args.shot, args.dive),
  };
}

export function parseDirection(raw: unknown): PenaltyDirection | null {
  const value = String(raw ?? "").toLowerCase();
  if (value === "left" || value === "center" || value === "right") return value;
  return null;
}
