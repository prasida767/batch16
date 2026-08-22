import "server-only";

import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb, challenges, managers } from "@/lib/db";
import { awardActivityPoints } from "@/lib/activity";
import { ACTIVITY_ACTIONS } from "@/lib/activity/types";
import {
  requireActingLeagueManager,
  requireLeagueManager,
} from "@/lib/challenges/identity";
import {
  CHALLENGE_ACTIVITY,
  CHALLENGE_STATUS,
  canMarkBaajiWinner,
  type ChallengeView,
} from "@/lib/challenges/types";

const creators = alias(managers, "challenge_creators");
const opponents = alias(managers, "challenge_opponents");
const winners = alias(managers, "challenge_winners");

function toView(row: {
  id: number;
  description: string;
  stakeNpr: string | null;
  gameweek: number | null;
  status: string;
  creatorId: number;
  opponentId: number;
  winnerId: number | null;
  createdAt: Date;
  resolvedAt: Date | null;
  creatorName: string;
  opponentName: string;
  winnerName: string | null;
}): ChallengeView {
  return {
    id: row.id,
    description: row.description,
    stakeNpr: row.stakeNpr,
    gameweek: row.gameweek,
    status: row.status,
    creatorId: row.creatorId,
    creatorName: row.creatorName,
    opponentId: row.opponentId,
    opponentName: row.opponentName,
    winnerId: row.winnerId,
    winnerName: row.winnerName,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt,
  };
}

async function listChallenges(filter?: {
  ids?: number[];
  statuses?: string[];
}) {
  const db = getDb();
  const conditions = [];
  if (filter?.ids?.length) {
    conditions.push(inArray(challenges.id, filter.ids));
  }
  if (filter?.statuses?.length) {
    conditions.push(inArray(challenges.status, filter.statuses));
  }

  const rows = await db
    .select({
      id: challenges.id,
      description: challenges.description,
      stakeNpr: challenges.stakeNpr,
      gameweek: challenges.gameweek,
      status: challenges.status,
      creatorId: challenges.creatorId,
      opponentId: challenges.opponentId,
      winnerId: challenges.winnerId,
      createdAt: challenges.createdAt,
      resolvedAt: challenges.resolvedAt,
      creatorName: creators.displayName,
      opponentName: opponents.displayName,
      winnerName: winners.displayName,
    })
    .from(challenges)
    .innerJoin(creators, eq(challenges.creatorId, creators.id))
    .innerJoin(opponents, eq(challenges.opponentId, opponents.id))
    .leftJoin(winners, eq(challenges.winnerId, winners.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(challenges.createdAt));

  return rows.map(toView);
}

export async function createChallenge(input: {
  creatorId: number;
  opponentId: number;
  description: string;
  stakeNpr?: number | null;
  gameweek?: number | null;
}): Promise<ChallengeView> {
  if (!Number.isInteger(input.creatorId) || input.creatorId <= 0) {
    throw new Error("Verify your manager account first.");
  }
  if (!Number.isInteger(input.opponentId) || input.opponentId <= 0) {
    throw new Error("Pick an opponent.");
  }
  const description = input.description.trim();
  if (description.length < 3) {
    throw new Error("Add a short description for the challenge.");
  }
  if (description.length > 280) {
    throw new Error("Description must be 280 characters or fewer.");
  }
  if (input.creatorId === input.opponentId) {
    throw new Error("You can't challenge yourself.");
  }

  const creator = await requireActingLeagueManager(input.creatorId);
  const opponent = await requireLeagueManager(input.opponentId);

  const { checkRateLimit, RATE_LIMITS } = await import(
    "@/lib/security/rate-limit"
  );
  const { sanitizeUserText } = await import("@/lib/security/sanitize");
  const limited = checkRateLimit(
    `baaji:${input.creatorId}`,
    RATE_LIMITS.baajiCreate.limit,
    RATE_LIMITS.baajiCreate.windowMs,
  );
  if (!limited.ok) {
    throw new Error(
      `Too many baajis — try again in ${limited.retryAfterSec}s.`,
    );
  }

  const stake =
    input.stakeNpr != null && Number.isFinite(input.stakeNpr)
      ? Math.max(0, Math.min(100_000, input.stakeNpr))
      : null;
  const gameweek =
    input.gameweek != null &&
    Number.isInteger(input.gameweek) &&
    input.gameweek > 0
      ? input.gameweek
      : null;

  const db = getDb();
  const [inserted] = await db
    .insert(challenges)
    .values({
      creatorId: input.creatorId,
      opponentId: input.opponentId,
      description: sanitizeUserText(description, 280),
      stakeNpr: stake != null ? stake.toFixed(2) : null,
      gameweek,
      status: CHALLENGE_STATUS.PENDING,
      updatedAt: new Date(),
    })
    .returning({ id: challenges.id });

  if (!inserted) {
    throw new Error("Couldn't save that baaji. Try again.");
  }

  try {
    await awardActivityPoints({
      managerId: input.creatorId,
      delta: CHALLENGE_ACTIVITY.CREATE,
      reason: `Created challenge #${inserted.id}`,
      actionKey: ACTIVITY_ACTIONS.CHALLENGE_CREATE,
    });
  } catch (error) {
    console.error("[baaji] Activity points failed after create", error);
  }

  const challenge: ChallengeView = {
    id: inserted.id,
    description: sanitizeUserText(description, 280),
    stakeNpr: stake != null ? stake.toFixed(2) : null,
    gameweek,
    status: CHALLENGE_STATUS.PENDING,
    creatorId: creator.id,
    creatorName: creator.displayName,
    opponentId: opponent.id,
    opponentName: opponent.displayName,
    winnerId: null,
    winnerName: null,
    createdAt: new Date(),
    resolvedAt: null,
  };

  try {
    const { createNotification, NOTIFICATION_TYPES } = await import(
      "@/lib/notifications"
    );
    await createNotification({
      recipientManagerId: input.opponentId,
      actorManagerId: input.creatorId,
      type: NOTIFICATION_TYPES.BAAJI_CHALLENGE,
      title: "New Baaji challenge",
      body: `${challenge.creatorName} challenged you: "${description.slice(0, 80)}"`,
      href: "/challenges",
      meta: { challengeId: challenge.id },
    });
  } catch (error) {
    console.error("[baaji] Notify failed after create", error);
  }

  return challenge;
}

export async function respondToChallenge(input: {
  challengeId: number;
  actorId: number;
  accept: boolean;
}) {
  if (!Number.isInteger(input.challengeId) || input.challengeId <= 0) {
    throw new Error("Challenge not found.");
  }
  if (!Number.isInteger(input.actorId) || input.actorId <= 0) {
    throw new Error("Verify your manager account first.");
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);

  if (!row) throw new Error("Challenge not found.");
  if (row.status !== CHALLENGE_STATUS.PENDING) {
    throw new Error("This challenge is no longer pending.");
  }
  if (row.opponentId !== input.actorId) {
    throw new Error("Only the opponent can accept or decline.");
  }

  await db
    .update(challenges)
    .set({
      status: input.accept
        ? CHALLENGE_STATUS.ACCEPTED
        : CHALLENGE_STATUS.DECLINED,
      updatedAt: new Date(),
      resolvedAt: input.accept ? null : new Date(),
    })
    .where(eq(challenges.id, input.challengeId));

  if (input.accept) {
    try {
      await awardActivityPoints({
        managerId: input.actorId,
        delta: CHALLENGE_ACTIVITY.ACCEPT,
        reason: `Accepted challenge #${input.challengeId}`,
        actionKey: ACTIVITY_ACTIONS.CHALLENGE_ACCEPT,
      });
    } catch (error) {
      console.error("[baaji] Activity points failed after accept", error);
    }
  }

  const [actor] = await db
    .select({ displayName: managers.displayName })
    .from(managers)
    .where(eq(managers.id, input.actorId))
    .limit(1);

  try {
    const { createNotification, NOTIFICATION_TYPES } = await import(
      "@/lib/notifications"
    );
    await createNotification({
      recipientManagerId: row.creatorId,
      actorManagerId: input.actorId,
      type: input.accept
        ? NOTIFICATION_TYPES.BAAJI_ACCEPTED
        : NOTIFICATION_TYPES.BAAJI_DECLINED,
      title: input.accept ? "Baaji accepted" : "Baaji declined",
      body: input.accept
        ? `${actor?.displayName ?? "Your opponent"} accepted your challenge.`
        : `${actor?.displayName ?? "Your opponent"} declined your challenge.`,
      href: "/challenges",
      meta: { challengeId: input.challengeId },
    });
  } catch (error) {
    console.error("[baaji] Notify failed after respond", error);
  }
}

export async function resolveChallenge(input: {
  challengeId: number;
  actorId: number;
  winnerId: number;
  asAdmin?: boolean;
}) {
  if (!Number.isInteger(input.challengeId) || input.challengeId <= 0) {
    throw new Error("Challenge not found.");
  }
  if (!Number.isInteger(input.winnerId) || input.winnerId <= 0) {
    throw new Error("Pick a winner.");
  }
  const db = getDb();
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);

  if (!row) throw new Error("Challenge not found.");
  if (row.status !== CHALLENGE_STATUS.ACCEPTED) {
    throw new Error("Only accepted challenges can be resolved.");
  }

  if (
    !canMarkBaajiWinner({
      actorId: input.actorId,
      creatorId: row.creatorId,
      opponentId: row.opponentId,
      asAdmin: input.asAdmin,
    })
  ) {
    throw new Error("Only the two managers (or admin) can mark the winner.");
  }

  if (
    input.winnerId !== row.creatorId &&
    input.winnerId !== row.opponentId
  ) {
    throw new Error("Winner must be one of the two managers.");
  }

  await db
    .update(challenges)
    .set({
      status: CHALLENGE_STATUS.COMPLETED,
      winnerId: input.winnerId,
      updatedAt: new Date(),
      resolvedAt: new Date(),
    })
    .where(eq(challenges.id, input.challengeId));

  const [winner] = await db
    .select({ displayName: managers.displayName })
    .from(managers)
    .where(eq(managers.id, input.winnerId))
    .limit(1);

  try {
    const { createNotification, NOTIFICATION_TYPES } = await import(
      "@/lib/notifications"
    );
    for (const recipientManagerId of [row.creatorId, row.opponentId]) {
      const youWon = recipientManagerId === input.winnerId;
      await createNotification({
        recipientManagerId,
        actorManagerId: input.actorId,
        type: NOTIFICATION_TYPES.BAAJI_RESULT,
        title: youWon ? "You won the Baaji" : "Baaji full-time",
        body: youWon
          ? "Full-time — you take the win."
          : `${winner?.displayName ?? "A manager"} won the baaji.`,
        href: "/challenges",
        meta: { challengeId: input.challengeId, winnerId: input.winnerId },
      });
    }
  } catch (error) {
    console.error("[baaji] Notify failed after resolve", error);
  }
}

export async function cancelChallenge(input: {
  challengeId: number;
  actorId: number;
}) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, input.challengeId))
    .limit(1);

  if (!row) throw new Error("Challenge not found.");
  if (row.creatorId !== input.actorId) {
    throw new Error("Only the creator can cancel.");
  }
  if (
    row.status !== CHALLENGE_STATUS.PENDING &&
    row.status !== CHALLENGE_STATUS.ACCEPTED
  ) {
    throw new Error("This challenge can't be cancelled.");
  }

  await db
    .update(challenges)
    .set({
      status: CHALLENGE_STATUS.CANCELLED,
      updatedAt: new Date(),
      resolvedAt: new Date(),
    })
    .where(eq(challenges.id, input.challengeId));
}

export async function getChallengesBoard(actingManagerId: number | null) {
  let all: ChallengeView[] = [];
  try {
    all = await listChallenges();
  } catch (error) {
    console.error("[baaji] List challenges failed", error);
    all = [];
  }

  /** Pending challenges waiting on the signed-in manager. */
  const awaitingYou =
    actingManagerId == null
      ? []
      : all.filter(
          (c) =>
            c.status === CHALLENGE_STATUS.PENDING &&
            c.opponentId === actingManagerId,
        );

  /** Every open challenge — visible to the whole league. */
  const active = all.filter(
    (c) =>
      c.status === CHALLENGE_STATUS.PENDING ||
      c.status === CHALLENGE_STATUS.ACCEPTED,
  );

  /** Full season log (every challenge posted). */
  const season = all;

  return { awaitingYou, active, season, all };
}

export async function listAcceptedChallengesForAdmin() {
  return listChallenges({ statuses: [CHALLENGE_STATUS.ACCEPTED] });
}

/** All challenges for admin overview (newest first). */
export async function listAllChallengesForAdmin() {
  return listChallenges();
}
