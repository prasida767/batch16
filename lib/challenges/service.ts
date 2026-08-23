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
  parsePositiveInt,
  parseStakeNpr,
  winnerFromGwPoints,
  type ChallengeView,
} from "@/lib/challenges/types";
import { fetchBootstrapStatic, fetchManagerHistory } from "@/lib/fpl";

const creators = alias(managers, "challenge_creators");
const opponents = alias(managers, "challenge_opponents");
const winners = alias(managers, "challenge_winners");

function toIso(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : String(value);
}

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
    creatorName: row.creatorName || "Manager",
    opponentId: row.opponentId,
    opponentName: row.opponentName || "Manager",
    winnerId: row.winnerId,
    winnerName: row.winnerName,
    createdAt: toIso(row.createdAt) ?? new Date().toISOString(),
    resolvedAt: toIso(row.resolvedAt),
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

async function notifyBaaji(input: {
  recipientManagerId: number;
  actorManagerId: number;
  type: string;
  title: string;
  body: string;
  challengeId: number;
  extra?: Record<string, unknown>;
}) {
  try {
    const { createNotification } = await import("@/lib/notifications");
    await createNotification({
      recipientManagerId: input.recipientManagerId,
      actorManagerId: input.actorManagerId,
      type: input.type,
      title: input.title,
      body: input.body,
      href: "/challenges",
      meta: { challengeId: input.challengeId, ...input.extra },
    });
  } catch (error) {
    console.error("[baaji] notification failed", error);
  }
}

async function tryAwardActivity(input: {
  managerId: number;
  delta: number;
  reason: string;
  actionKey: string;
}) {
  try {
    await awardActivityPoints(input);
  } catch (error) {
    console.error("[baaji] activity points skipped", error);
  }
}

export async function createChallenge(input: {
  creatorId: number;
  opponentId: number;
  description: string;
  stakeNpr?: number | null;
  gameweek?: number | null;
}): Promise<ChallengeView> {
  const description = String(input.description ?? "").trim();
  if (description.length < 3) {
    throw new Error("Add a short description for the challenge.");
  }
  if (description.length > 280) {
    throw new Error("Description must be 280 characters or fewer.");
  }

  const creatorId = parsePositiveInt(input.creatorId);
  const opponentId = parsePositiveInt(input.opponentId);
  if (creatorId == null || opponentId == null) {
    throw new Error("Pick a verified manager to challenge.");
  }
  if (creatorId === opponentId) {
    throw new Error("You can't challenge yourself.");
  }

  const creator = await requireActingLeagueManager(creatorId);
  const opponent = await requireLeagueManager(opponentId);

  const { checkRateLimit, RATE_LIMITS } = await import(
    "@/lib/security/rate-limit"
  );
  const { sanitizeUserText } = await import("@/lib/security/sanitize");
  const limited = checkRateLimit(
    `baaji:${creatorId}`,
    RATE_LIMITS.baajiCreate.limit,
    RATE_LIMITS.baajiCreate.windowMs,
  );
  if (!limited.ok) {
    throw new Error(
      `Too many baajis — try again in ${limited.retryAfterSec}s.`,
    );
  }

  const stake = parseStakeNpr(input.stakeNpr);
  const gameweek = parsePositiveInt(input.gameweek);

  const db = getDb();
  const [inserted] = await db
    .insert(challenges)
    .values({
      creatorId,
      opponentId,
      description: sanitizeUserText(description, 280),
      stakeNpr: stake != null ? stake.toFixed(2) : null,
      gameweek,
      status: CHALLENGE_STATUS.PENDING,
      updatedAt: new Date(),
    })
    .returning({ id: challenges.id });

  if (!inserted?.id) {
    throw new Error("Couldn't create baaji.");
  }

  await tryAwardActivity({
    managerId: creatorId,
    delta: CHALLENGE_ACTIVITY.CREATE,
    reason: `Created challenge #${inserted.id}`,
    actionKey: ACTIVITY_ACTIONS.CHALLENGE_CREATE,
  });

  const { NOTIFICATION_TYPES } = await import("@/lib/notifications");
  await notifyBaaji({
    recipientManagerId: opponentId,
    actorManagerId: creatorId,
    type: NOTIFICATION_TYPES.BAAJI_CHALLENGE,
    title: "New Baaji challenge",
    body: `${creator.displayName} challenged you: “${description.slice(0, 80)}”`,
    challengeId: inserted.id,
  });

  const [view] = await listChallenges({ ids: [inserted.id] }).catch(() => []);
  return (
    view ?? {
      id: inserted.id,
      description,
      stakeNpr: stake != null ? stake.toFixed(2) : null,
      gameweek,
      status: CHALLENGE_STATUS.PENDING,
      creatorId,
      creatorName: creator.displayName,
      opponentId,
      opponentName: opponent.displayName,
      winnerId: null,
      winnerName: null,
      createdAt: new Date().toISOString(),
      resolvedAt: null,
    }
  );
}

export async function respondToChallenge(input: {
  challengeId: number;
  actorId: number;
  accept: boolean;
}) {
  const challengeId = parsePositiveInt(input.challengeId);
  const actorId = parsePositiveInt(input.actorId);
  if (challengeId == null || actorId == null) {
    throw new Error("Invalid baaji.");
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!row) throw new Error("Challenge not found.");
  if (row.status !== CHALLENGE_STATUS.PENDING) {
    throw new Error("This challenge is no longer pending.");
  }
  if (row.opponentId !== actorId) {
    throw new Error("Only the opponent can accept or decline.");
  }

  await requireActingLeagueManager(actorId);

  await db
    .update(challenges)
    .set({
      status: input.accept
        ? CHALLENGE_STATUS.ACCEPTED
        : CHALLENGE_STATUS.DECLINED,
      updatedAt: new Date(),
      resolvedAt: input.accept ? null : new Date(),
    })
    .where(eq(challenges.id, challengeId));

  if (input.accept) {
    await tryAwardActivity({
      managerId: actorId,
      delta: CHALLENGE_ACTIVITY.ACCEPT,
      reason: `Accepted challenge #${challengeId}`,
      actionKey: ACTIVITY_ACTIONS.CHALLENGE_ACCEPT,
    });
  }

  const [actor] = await db
    .select({ displayName: managers.displayName })
    .from(managers)
    .where(eq(managers.id, actorId))
    .limit(1);

  const { NOTIFICATION_TYPES } = await import("@/lib/notifications");
  await notifyBaaji({
    recipientManagerId: row.creatorId,
    actorManagerId: actorId,
    type: input.accept
      ? NOTIFICATION_TYPES.BAAJI_ACCEPTED
      : NOTIFICATION_TYPES.BAAJI_DECLINED,
    title: input.accept ? "Baaji accepted" : "Baaji declined",
    body: input.accept
      ? `${actor?.displayName ?? "Your opponent"} accepted your challenge.`
      : `${actor?.displayName ?? "Your opponent"} declined your challenge.`,
    challengeId,
  });
}

export async function resolveChallenge(input: {
  challengeId: number;
  actorId: number;
  winnerId: number;
  asAdmin?: boolean;
}) {
  const challengeId = parsePositiveInt(input.challengeId);
  const actorId = parsePositiveInt(input.actorId);
  const winnerId = parsePositiveInt(input.winnerId);
  if (challengeId == null || actorId == null || winnerId == null) {
    throw new Error("Pick a winner.");
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!row) throw new Error("Challenge not found.");
  if (row.status !== CHALLENGE_STATUS.ACCEPTED) {
    throw new Error("Only accepted challenges can be resolved.");
  }

  if (!input.asAdmin && row.creatorId !== actorId) {
    throw new Error("Only the creator (or admin) can mark the winner.");
  }

  if (winnerId !== row.creatorId && winnerId !== row.opponentId) {
    throw new Error("Winner must be one of the two managers.");
  }

  await db
    .update(challenges)
    .set({
      status: CHALLENGE_STATUS.COMPLETED,
      winnerId,
      updatedAt: new Date(),
      resolvedAt: new Date(),
    })
    .where(eq(challenges.id, challengeId));

  const [winner] = await db
    .select({ displayName: managers.displayName })
    .from(managers)
    .where(eq(managers.id, winnerId))
    .limit(1);

  const { NOTIFICATION_TYPES } = await import("@/lib/notifications");
  for (const recipientManagerId of [row.creatorId, row.opponentId]) {
    const youWon = recipientManagerId === winnerId;
    await notifyBaaji({
      recipientManagerId,
      actorManagerId: actorId,
      type: NOTIFICATION_TYPES.BAAJI_RESULT,
      title: youWon ? "You won the Baaji" : "Baaji full-time",
      body: youWon
        ? "Full-time — you take the win."
        : `${winner?.displayName ?? "A manager"} won the baaji.`,
      challengeId,
      extra: { winnerId },
    });
  }
}

export async function cancelChallenge(input: {
  challengeId: number;
  actorId: number;
}) {
  const challengeId = parsePositiveInt(input.challengeId);
  const actorId = parsePositiveInt(input.actorId);
  if (challengeId == null || actorId == null) {
    throw new Error("Invalid baaji.");
  }

  const db = getDb();
  const [row] = await db
    .select()
    .from(challenges)
    .where(eq(challenges.id, challengeId))
    .limit(1);

  if (!row) throw new Error("Challenge not found.");
  if (row.creatorId !== actorId) {
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
    .where(eq(challenges.id, challengeId));
}

function gwHistoryPoints(
  history: { current?: { event: number; points: number }[] } | null | undefined,
  gameweek: number,
): number | null {
  const row = history?.current?.find((event) => event.event === gameweek);
  if (!row || !Number.isFinite(row.points)) return null;
  return row.points;
}

/**
 * When an accepted baaji has a finished gameweek, the higher FPL GW score wins.
 * Ties stay open for admin. Never throws into page load.
 */
export async function autoResolveFinishedBaajis(): Promise<void> {
  try {
    const accepted = await listChallenges({
      statuses: [CHALLENGE_STATUS.ACCEPTED],
    });
    const due = accepted.filter(
      (row) => row.gameweek != null && row.gameweek > 0,
    );
    if (due.length === 0) return;

    const bootstrap = await fetchBootstrapStatic();
    const finished = new Set(
      (bootstrap.events ?? [])
        .filter((event) => event.finished)
        .map((event) => event.id),
    );
    const ready = due.filter(
      (row) => row.gameweek != null && finished.has(row.gameweek),
    );
    if (ready.length === 0) return;

    const managerIds = [
      ...new Set(ready.flatMap((row) => [row.creatorId, row.opponentId])),
    ];
    const db = getDb();
    const managerRows = await db
      .select({ id: managers.id, fplEntryId: managers.fplEntryId })
      .from(managers)
      .where(inArray(managers.id, managerIds));
    const entryByManager = new Map(
      managerRows.map((row) => [row.id, row.fplEntryId] as const),
    );

    const historyByEntry = new Map<
      number,
      Awaited<ReturnType<typeof fetchManagerHistory>>
    >();
    const entryIds = [
      ...new Set(
        managerRows
          .map((row) => row.fplEntryId)
          .filter((id): id is number => id != null && Number.isFinite(id) && id > 0),
      ),
    ];
    for (const entryId of entryIds) {
      try {
        historyByEntry.set(entryId, await fetchManagerHistory(entryId));
      } catch (error) {
        console.error("[baaji] history fetch skipped", entryId, error);
      }
    }

    for (const challenge of ready) {
      const creatorEntry = entryByManager.get(challenge.creatorId);
      const opponentEntry = entryByManager.get(challenge.opponentId);
      const winnerId = winnerFromGwPoints(
        gwHistoryPoints(
          creatorEntry != null ? historyByEntry.get(creatorEntry) : null,
          challenge.gameweek!,
        ),
        gwHistoryPoints(
          opponentEntry != null ? historyByEntry.get(opponentEntry) : null,
          challenge.gameweek!,
        ),
        challenge.creatorId,
        challenge.opponentId,
      );
      if (winnerId == null) continue;
      await resolveChallenge({
        challengeId: challenge.id,
        actorId: challenge.creatorId,
        winnerId,
        asAdmin: true,
      });
    }
  } catch (error) {
    console.error("[baaji] auto-resolve skipped", error);
  }
}

export async function getChallengesBoard(actingManagerId: number | null) {
  try {
    const all = await listChallenges();

    const awaitingYou =
      actingManagerId == null
        ? []
        : all.filter(
            (c) =>
              c.status === CHALLENGE_STATUS.PENDING &&
              c.opponentId === actingManagerId,
          );

    const active = all.filter(
      (c) =>
        c.status === CHALLENGE_STATUS.PENDING ||
        c.status === CHALLENGE_STATUS.ACCEPTED,
    );

    return { awaitingYou, active, season: all, all };
  } catch (error) {
    console.error("[baaji] board failed", error);
    return { awaitingYou: [], active: [], season: [], all: [] };
  }
}

export async function listAcceptedChallengesForAdmin() {
  return listChallenges({ statuses: [CHALLENGE_STATUS.ACCEPTED] });
}

/** All challenges for admin overview (newest first). */
export async function listAllChallengesForAdmin() {
  return listChallenges();
}
