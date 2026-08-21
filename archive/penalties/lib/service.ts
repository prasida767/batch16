import "server-only";

import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import { getDb, managers, penaltyMatches } from "@/lib/db";
import type { PenaltyDirection, PenaltyRoundRecord } from "@/lib/db/schema";
import { awardActivityPoints } from "@/lib/activity";
import { ACTIVITY_ACTIONS } from "@/lib/activity/types";
import {
  requireActingLeagueManager,
  requireLeagueManager,
} from "@/lib/challenges/identity";
import {
  buildRound,
  canEndEarly,
  parseDirection,
  randomDirection,
  resolveWinnerIds,
  rolesForRound,
} from "@/lib/penalties/game";
import {
  PENALTY_ACTIVITY,
  PENALTY_MODE,
  PENALTY_PHASE,
  PENALTY_STATUS,
  type PenaltyHistoryRow,
  type PenaltyLeaderboardRow,
  type PenaltyMatchView,
} from "@/lib/penalties/types";

const challengers = alias(managers, "penalty_challengers");
const opponents = alias(managers, "penalty_opponents");
const winners = alias(managers, "penalty_winners");

function toView(row: {
  id: number;
  mode: string;
  status: string;
  phase: string;
  challengerId: number;
  opponentId: number | null;
  challengerScore: number;
  opponentScore: number;
  winnerId: number | null;
  currentRound: number;
  maxRounds: number;
  challengerChoice: string | null;
  opponentChoice: string | null;
  rounds: PenaltyRoundRecord[] | null;
  createdAt: Date;
  completedAt: Date | null;
  challengerName: string;
  challengerAvatar: string | null;
  opponentName: string | null;
  opponentAvatar: string | null;
  winnerName: string | null;
}): PenaltyMatchView {
  const roles =
    row.mode === PENALTY_MODE.SOLO
      ? { shooterId: row.challengerId, keeperId: null as number | null }
      : rolesForRound(row.currentRound, row.challengerId, row.opponentId);
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    phase: row.phase,
    challengerId: row.challengerId,
    challengerName: row.challengerName,
    challengerAvatar: row.challengerAvatar,
    opponentId: row.opponentId,
    opponentName:
      row.mode === PENALTY_MODE.SOLO
        ? "Computer"
        : (row.opponentName ?? "Opponent"),
    opponentAvatar: row.opponentAvatar,
    challengerScore: row.challengerScore,
    opponentScore: row.opponentScore,
    winnerId: row.winnerId,
    winnerName: row.winnerName,
    currentRound: row.currentRound,
    maxRounds: row.maxRounds,
    challengerChoice: parseDirection(row.challengerChoice),
    opponentChoice: parseDirection(row.opponentChoice),
    rounds: row.rounds ?? [],
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    shooterId: roles.shooterId,
    keeperId: roles.keeperId,
  };
}

async function fetchMatch(id: number): Promise<PenaltyMatchView | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: penaltyMatches.id,
      mode: penaltyMatches.mode,
      status: penaltyMatches.status,
      phase: penaltyMatches.phase,
      challengerId: penaltyMatches.challengerId,
      opponentId: penaltyMatches.opponentId,
      challengerScore: penaltyMatches.challengerScore,
      opponentScore: penaltyMatches.opponentScore,
      winnerId: penaltyMatches.winnerId,
      currentRound: penaltyMatches.currentRound,
      maxRounds: penaltyMatches.maxRounds,
      challengerChoice: penaltyMatches.challengerChoice,
      opponentChoice: penaltyMatches.opponentChoice,
      rounds: penaltyMatches.rounds,
      createdAt: penaltyMatches.createdAt,
      completedAt: penaltyMatches.completedAt,
      challengerName: challengers.displayName,
      challengerAvatar: challengers.avatarUrl,
      opponentName: opponents.displayName,
      opponentAvatar: opponents.avatarUrl,
      winnerName: winners.displayName,
    })
    .from(penaltyMatches)
    .innerJoin(challengers, eq(penaltyMatches.challengerId, challengers.id))
    .leftJoin(opponents, eq(penaltyMatches.opponentId, opponents.id))
    .leftJoin(winners, eq(penaltyMatches.winnerId, winners.id))
    .where(eq(penaltyMatches.id, id))
    .limit(1);

  return row ? toView(row) : null;
}

export async function getPenaltyMatch(
  id: number,
  viewerId?: number | null,
): Promise<PenaltyMatchView | null> {
  const match = await fetchMatch(id);
  if (!match) return null;

  const isParticipant =
    viewerId != null &&
    (viewerId === match.challengerId ||
      (match.opponentId != null && viewerId === match.opponentId));

  // Active matches: only participants may load live state.
  if (
    match.status === PENALTY_STATUS.PENDING ||
    match.status === PENALTY_STATUS.ACTIVE
  ) {
    if (!isParticipant) return null;
  }

  // While choosing, never leak the opponent's locked-in direction.
  if (match.phase === PENALTY_PHASE.CHOOSING && isParticipant) {
    return {
      ...match,
      challengerChoice:
        viewerId === match.challengerId ? match.challengerChoice : null,
      opponentChoice:
        viewerId === match.opponentId ? match.opponentChoice : null,
    };
  }

  return match;
}

export async function listPenaltyManagers() {
  const db = getDb();
  return db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      avatarUrl: managers.avatarUrl,
      supportedTeamId: managers.supportedTeamId,
      supportedTeamCode: managers.supportedTeamCode,
      avatarVariant: managers.avatarVariant,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers)
    .where(sql`${managers.fplEntryId} is not null`)
    .orderBy(managers.displayName);
}

export async function startSoloMatch(managerId: number): Promise<PenaltyMatchView> {
  await requireActingLeagueManager(managerId);
  const db = getDb();

  // End any stuck active solos so the lobby always has one clear match.
  await db
    .update(penaltyMatches)
    .set({
      status: PENALTY_STATUS.CANCELLED,
      phase: PENALTY_PHASE.FINISHED,
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(
      and(
        eq(penaltyMatches.challengerId, managerId),
        eq(penaltyMatches.mode, PENALTY_MODE.SOLO),
        eq(penaltyMatches.status, PENALTY_STATUS.ACTIVE),
      ),
    );

  const [row] = await db
    .insert(penaltyMatches)
    .values({
      mode: PENALTY_MODE.SOLO,
      status: PENALTY_STATUS.ACTIVE,
      phase: PENALTY_PHASE.CHOOSING,
      challengerId: managerId,
      opponentId: null,
      currentRound: 1,
      maxRounds: 5,
      rounds: [],
    })
    .returning({ id: penaltyMatches.id });

  await awardActivityPoints({
    managerId,
    delta: PENALTY_ACTIVITY.PLAY,
    reason: "Played Penalty Shootout (solo)",
    actionKey: ACTIVITY_ACTIONS.PENALTY_PLAY,
  });

  const match = await fetchMatch(row!.id);
  if (!match) throw new Error("Failed to create solo match.");
  return match;
}

export async function createPenaltyChallenge(input: {
  challengerId: number;
  opponentId: number;
}): Promise<PenaltyMatchView> {
  await requireActingLeagueManager(input.challengerId);
  await requireLeagueManager(input.opponentId);

  if (input.challengerId === input.opponentId) {
    throw new Error("You cannot challenge yourself.");
  }

  const db = getDb();

  const open = await db
    .select({ id: penaltyMatches.id })
    .from(penaltyMatches)
    .where(
      and(
        eq(penaltyMatches.mode, PENALTY_MODE.MULTIPLAYER),
        inArray(penaltyMatches.status, [
          PENALTY_STATUS.PENDING,
          PENALTY_STATUS.ACTIVE,
        ]),
        or(
          and(
            eq(penaltyMatches.challengerId, input.challengerId),
            eq(penaltyMatches.opponentId, input.opponentId),
          ),
          and(
            eq(penaltyMatches.challengerId, input.opponentId),
            eq(penaltyMatches.opponentId, input.challengerId),
          ),
        ),
      ),
    )
    .limit(1);

  if (open.length) {
    throw new Error("You already have an open challenge with this manager.");
  }

  const [row] = await db
    .insert(penaltyMatches)
    .values({
      mode: PENALTY_MODE.MULTIPLAYER,
      status: PENALTY_STATUS.PENDING,
      phase: PENALTY_PHASE.CHOOSING,
      challengerId: input.challengerId,
      opponentId: input.opponentId,
      currentRound: 1,
      maxRounds: 5,
      rounds: [],
    })
    .returning({ id: penaltyMatches.id });

  await awardActivityPoints({
    managerId: input.challengerId,
    delta: PENALTY_ACTIVITY.CHALLENGE,
    reason: "Challenged someone to Penalty Shootout",
    actionKey: ACTIVITY_ACTIONS.PENALTY_CHALLENGE,
  });

  const match = await fetchMatch(row!.id);
  if (!match) throw new Error("Failed to create challenge.");
  return match;
}

export async function respondToPenaltyChallenge(input: {
  matchId: number;
  managerId: number;
  accept: boolean;
}): Promise<PenaltyMatchView> {
  await requireActingLeagueManager(input.managerId);
  const db = getDb();

  const [existing] = await db
    .select()
    .from(penaltyMatches)
    .where(eq(penaltyMatches.id, input.matchId))
    .limit(1);

  if (!existing) throw new Error("Challenge not found.");
  if (existing.status !== PENALTY_STATUS.PENDING) {
    throw new Error("This challenge is no longer pending.");
  }
  if (existing.opponentId !== input.managerId) {
    throw new Error("Only the challenged manager can respond.");
  }

  if (!input.accept) {
    await db
      .update(penaltyMatches)
      .set({
        status: PENALTY_STATUS.DECLINED,
        phase: PENALTY_PHASE.FINISHED,
        updatedAt: new Date(),
        completedAt: new Date(),
      })
      .where(eq(penaltyMatches.id, input.matchId));
  } else {
    await db
      .update(penaltyMatches)
      .set({
        status: PENALTY_STATUS.ACTIVE,
        phase: PENALTY_PHASE.CHOOSING,
        updatedAt: new Date(),
      })
      .where(eq(penaltyMatches.id, input.matchId));

    await awardActivityPoints({
      managerId: input.managerId,
      delta: PENALTY_ACTIVITY.ACCEPT,
      reason: "Accepted a Penalty Shootout challenge",
      actionKey: ACTIVITY_ACTIONS.PENALTY_ACCEPT,
    });
    await awardActivityPoints({
      managerId: existing.challengerId,
      delta: PENALTY_ACTIVITY.PLAY,
      reason: "Penalty Shootout multiplayer started",
      actionKey: ACTIVITY_ACTIONS.PENALTY_PLAY,
    });
    await awardActivityPoints({
      managerId: input.managerId,
      delta: PENALTY_ACTIVITY.PLAY,
      reason: "Penalty Shootout multiplayer started",
      actionKey: ACTIVITY_ACTIONS.PENALTY_PLAY,
    });
  }

  const match = await fetchMatch(input.matchId);
  if (!match) throw new Error("Challenge missing after respond.");
  return match;
}

export async function cancelPenaltyChallenge(input: {
  matchId: number;
  managerId: number;
}): Promise<PenaltyMatchView> {
  await requireActingLeagueManager(input.managerId);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(penaltyMatches)
    .where(eq(penaltyMatches.id, input.matchId))
    .limit(1);

  if (!existing) throw new Error("Challenge not found.");
  if (existing.challengerId !== input.managerId) {
    throw new Error("Only the challenger can cancel.");
  }
  if (existing.status !== PENALTY_STATUS.PENDING) {
    throw new Error("Only pending challenges can be cancelled.");
  }

  await db
    .update(penaltyMatches)
    .set({
      status: PENALTY_STATUS.CANCELLED,
      phase: PENALTY_PHASE.FINISHED,
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(penaltyMatches.id, input.matchId));

  const match = await fetchMatch(input.matchId);
  if (!match) throw new Error("Challenge missing after cancel.");
  return match;
}

async function finishMatch(args: {
  matchId: number;
  challengerId: number;
  opponentId: number | null;
  challengerScore: number;
  opponentScore: number;
  rounds: PenaltyRoundRecord[];
  mode: string;
}) {
  const winnerId = resolveWinnerIds(args);
  const db = getDb();
  await db
    .update(penaltyMatches)
    .set({
      status: PENALTY_STATUS.COMPLETED,
      phase: PENALTY_PHASE.FINISHED,
      challengerScore: args.challengerScore,
      opponentScore: args.opponentScore,
      winnerId,
      rounds: args.rounds,
      challengerChoice: null,
      opponentChoice: null,
      updatedAt: new Date(),
      completedAt: new Date(),
    })
    .where(eq(penaltyMatches.id, args.matchId));

  if (winnerId != null) {
    await awardActivityPoints({
      managerId: winnerId,
      delta: PENALTY_ACTIVITY.WIN,
      reason:
        args.mode === PENALTY_MODE.SOLO
          ? "Won Penalty Shootout vs Computer"
          : "Won Penalty Shootout multiplayer",
      actionKey: ACTIVITY_ACTIONS.PENALTY_WIN,
    });
  }
}

/**
 * Solo: player always shoots; CPU dives. `choice` is the shot direction.
 */
export async function submitSoloKick(input: {
  matchId: number;
  managerId: number;
  choice: PenaltyDirection;
}): Promise<{ match: PenaltyMatchView; lastRound: PenaltyRoundRecord }> {
  await requireActingLeagueManager(input.managerId);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(penaltyMatches)
    .where(eq(penaltyMatches.id, input.matchId))
    .limit(1);

  if (!existing) throw new Error("Match not found.");
  if (existing.mode !== PENALTY_MODE.SOLO) {
    throw new Error("Not a solo match.");
  }
  if (existing.challengerId !== input.managerId) {
    throw new Error("Not your match.");
  }
  if (existing.status !== PENALTY_STATUS.ACTIVE) {
    throw new Error("Match is not active.");
  }
  if (existing.phase !== PENALTY_PHASE.CHOOSING) {
    throw new Error("Waiting for reveal to finish.");
  }

  const dive = randomDirection();
  const round = buildRound({
    round: existing.currentRound,
    shooterId: input.managerId,
    keeperId: null,
    shot: input.choice,
    dive,
  });

  const rounds = [...(existing.rounds ?? []), round];
  const challengerScore = existing.challengerScore + (round.scored ? 1 : 0);
  const opponentScore = existing.opponentScore + (round.scored ? 0 : 1);

  const roundDone = existing.currentRound;
  const shouldEnd =
    roundDone >= existing.maxRounds ||
    canEndEarly(roundDone, existing.maxRounds, challengerScore, opponentScore);

  if (shouldEnd) {
    await finishMatch({
      matchId: existing.id,
      challengerId: existing.challengerId,
      opponentId: null,
      challengerScore,
      opponentScore,
      rounds,
      mode: existing.mode,
    });
  } else {
    await db
      .update(penaltyMatches)
      .set({
        challengerScore,
        opponentScore,
        rounds,
        currentRound: existing.currentRound + 1,
        phase: PENALTY_PHASE.CHOOSING,
        updatedAt: new Date(),
      })
      .where(eq(penaltyMatches.id, existing.id));
  }

  const match = await fetchMatch(existing.id);
  if (!match) throw new Error("Match missing after kick.");
  return { match, lastRound: round };
}

/**
 * Multiplayer: both pick a direction each round.
 * Shooter’s choice = shot; keeper’s choice = dive.
 */
export async function submitMultiplayerChoice(input: {
  matchId: number;
  managerId: number;
  choice: PenaltyDirection;
}): Promise<PenaltyMatchView> {
  await requireActingLeagueManager(input.managerId);
  const db = getDb();
  const [existing] = await db
    .select()
    .from(penaltyMatches)
    .where(eq(penaltyMatches.id, input.matchId))
    .limit(1);

  if (!existing) throw new Error("Match not found.");
  if (existing.mode !== PENALTY_MODE.MULTIPLAYER) {
    throw new Error("Not a multiplayer match.");
  }
  if (existing.status !== PENALTY_STATUS.ACTIVE) {
    throw new Error("Match is not active.");
  }
  if (existing.phase !== PENALTY_PHASE.CHOOSING) {
    throw new Error("Not accepting choices right now.");
  }
  if (
    existing.challengerId !== input.managerId &&
    existing.opponentId !== input.managerId
  ) {
    throw new Error("You are not in this match.");
  }

  const isChallenger = existing.challengerId === input.managerId;
  if (isChallenger && existing.challengerChoice) {
    throw new Error("You already locked in this round.");
  }
  if (!isChallenger && existing.opponentChoice) {
    throw new Error("You already locked in this round.");
  }

  const nextChallengerChoice = isChallenger
    ? input.choice
    : existing.challengerChoice;
  const nextOpponentChoice = isChallenger
    ? existing.opponentChoice
    : input.choice;

  if (!nextChallengerChoice || !nextOpponentChoice) {
    await db
      .update(penaltyMatches)
      .set({
        challengerChoice: nextChallengerChoice,
        opponentChoice: nextOpponentChoice,
        updatedAt: new Date(),
      })
      .where(eq(penaltyMatches.id, existing.id));
    const match = await getPenaltyMatch(existing.id, input.managerId);
    if (!match) throw new Error("Match missing.");
    return match;
  }

  // Both locked — resolve
  const roles = rolesForRound(
    existing.currentRound,
    existing.challengerId,
    existing.opponentId,
  );
  const shot =
    roles.shooterId === existing.challengerId
      ? (parseDirection(nextChallengerChoice) as PenaltyDirection)
      : (parseDirection(nextOpponentChoice) as PenaltyDirection);
  const dive =
    roles.keeperId === existing.challengerId
      ? (parseDirection(nextChallengerChoice) as PenaltyDirection)
      : (parseDirection(nextOpponentChoice) as PenaltyDirection);

  const round = buildRound({
    round: existing.currentRound,
    shooterId: roles.shooterId,
    keeperId: roles.keeperId,
    shot,
    dive,
  });

  const rounds = [...(existing.rounds ?? []), round];
  let challengerScore = existing.challengerScore;
  let opponentScore = existing.opponentScore;

  if (round.scored) {
    if (roles.shooterId === existing.challengerId) challengerScore += 1;
    else opponentScore += 1;
  }

  const roundDone = existing.currentRound;
  const shouldEnd =
    roundDone >= existing.maxRounds ||
    canEndEarly(roundDone, existing.maxRounds, challengerScore, opponentScore);

  if (shouldEnd) {
    await finishMatch({
      matchId: existing.id,
      challengerId: existing.challengerId,
      opponentId: existing.opponentId,
      challengerScore,
      opponentScore,
      rounds,
      mode: existing.mode,
    });
  } else {
    await db
      .update(penaltyMatches)
      .set({
        challengerScore,
        opponentScore,
        rounds,
        currentRound: existing.currentRound + 1,
        phase: PENALTY_PHASE.CHOOSING,
        challengerChoice: null,
        opponentChoice: null,
        updatedAt: new Date(),
      })
      .where(eq(penaltyMatches.id, existing.id));
  }

  const match = await fetchMatch(existing.id);
  if (!match) throw new Error("Match missing after resolve.");
  return match;
}

export async function listPendingForManager(managerId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: penaltyMatches.id,
      mode: penaltyMatches.mode,
      status: penaltyMatches.status,
      phase: penaltyMatches.phase,
      challengerId: penaltyMatches.challengerId,
      opponentId: penaltyMatches.opponentId,
      challengerScore: penaltyMatches.challengerScore,
      opponentScore: penaltyMatches.opponentScore,
      winnerId: penaltyMatches.winnerId,
      currentRound: penaltyMatches.currentRound,
      maxRounds: penaltyMatches.maxRounds,
      challengerChoice: penaltyMatches.challengerChoice,
      opponentChoice: penaltyMatches.opponentChoice,
      rounds: penaltyMatches.rounds,
      createdAt: penaltyMatches.createdAt,
      completedAt: penaltyMatches.completedAt,
      challengerName: challengers.displayName,
      challengerAvatar: challengers.avatarUrl,
      opponentName: opponents.displayName,
      opponentAvatar: opponents.avatarUrl,
      winnerName: winners.displayName,
    })
    .from(penaltyMatches)
    .innerJoin(challengers, eq(penaltyMatches.challengerId, challengers.id))
    .leftJoin(opponents, eq(penaltyMatches.opponentId, opponents.id))
    .leftJoin(winners, eq(penaltyMatches.winnerId, winners.id))
    .where(
      and(
        eq(penaltyMatches.status, PENALTY_STATUS.PENDING),
        or(
          eq(penaltyMatches.opponentId, managerId),
          eq(penaltyMatches.challengerId, managerId),
        ),
      ),
    )
    .orderBy(desc(penaltyMatches.createdAt));

  return rows.map(toView);
}

export async function listActiveForManager(managerId: number) {
  const db = getDb();
  const rows = await db
    .select({
      id: penaltyMatches.id,
      mode: penaltyMatches.mode,
      status: penaltyMatches.status,
      phase: penaltyMatches.phase,
      challengerId: penaltyMatches.challengerId,
      opponentId: penaltyMatches.opponentId,
      challengerScore: penaltyMatches.challengerScore,
      opponentScore: penaltyMatches.opponentScore,
      winnerId: penaltyMatches.winnerId,
      currentRound: penaltyMatches.currentRound,
      maxRounds: penaltyMatches.maxRounds,
      challengerChoice: penaltyMatches.challengerChoice,
      opponentChoice: penaltyMatches.opponentChoice,
      rounds: penaltyMatches.rounds,
      createdAt: penaltyMatches.createdAt,
      completedAt: penaltyMatches.completedAt,
      challengerName: challengers.displayName,
      challengerAvatar: challengers.avatarUrl,
      opponentName: opponents.displayName,
      opponentAvatar: opponents.avatarUrl,
      winnerName: winners.displayName,
    })
    .from(penaltyMatches)
    .innerJoin(challengers, eq(penaltyMatches.challengerId, challengers.id))
    .leftJoin(opponents, eq(penaltyMatches.opponentId, opponents.id))
    .leftJoin(winners, eq(penaltyMatches.winnerId, winners.id))
    .where(
      and(
        eq(penaltyMatches.status, PENALTY_STATUS.ACTIVE),
        or(
          eq(penaltyMatches.challengerId, managerId),
          eq(penaltyMatches.opponentId, managerId),
        ),
      ),
    )
    .orderBy(desc(penaltyMatches.updatedAt));

  return rows.map(toView);
}

export async function getPenaltyHistory(input: {
  managerId?: number | null;
  mineOnly?: boolean;
}): Promise<PenaltyHistoryRow[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: penaltyMatches.id,
      mode: penaltyMatches.mode,
      challengerId: penaltyMatches.challengerId,
      opponentId: penaltyMatches.opponentId,
      challengerScore: penaltyMatches.challengerScore,
      opponentScore: penaltyMatches.opponentScore,
      winnerId: penaltyMatches.winnerId,
      createdAt: penaltyMatches.createdAt,
      completedAt: penaltyMatches.completedAt,
      challengerName: challengers.displayName,
      opponentName: opponents.displayName,
      winnerName: winners.displayName,
    })
    .from(penaltyMatches)
    .innerJoin(challengers, eq(penaltyMatches.challengerId, challengers.id))
    .leftJoin(opponents, eq(penaltyMatches.opponentId, opponents.id))
    .leftJoin(winners, eq(penaltyMatches.winnerId, winners.id))
    .where(
      and(
        eq(penaltyMatches.status, PENALTY_STATUS.COMPLETED),
        input.mineOnly && input.managerId
          ? or(
              eq(penaltyMatches.challengerId, input.managerId),
              eq(penaltyMatches.opponentId, input.managerId),
            )
          : undefined,
      ),
    )
    .orderBy(desc(penaltyMatches.completedAt))
    .limit(80);

  return rows.map((row) => {
    const me = input.managerId;
    const iAmChallenger = me != null && row.challengerId === me;
    const opponentName =
      row.mode === PENALTY_MODE.SOLO
        ? "Computer"
        : iAmChallenger
          ? (row.opponentName ?? "Opponent")
          : row.challengerName;
    const myScore = iAmChallenger
      ? row.challengerScore
      : me != null && row.opponentId === me
        ? row.opponentScore
        : row.challengerScore;
    const theirScore = iAmChallenger
      ? row.opponentScore
      : me != null && row.opponentId === me
        ? row.challengerScore
        : row.opponentScore;

    return {
      id: row.id,
      mode: row.mode,
      opponentName:
        me == null
          ? `${row.challengerName} vs ${row.mode === PENALTY_MODE.SOLO ? "Computer" : (row.opponentName ?? "?")}`
          : opponentName,
      myScore,
      theirScore,
      winnerName: row.winnerName,
      iWon: me != null && row.winnerId === me,
      isDraw: row.winnerId == null,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    };
  });
}

export async function getPenaltyLeaderboard(): Promise<PenaltyLeaderboardRow[]> {
  const db = getDb();
  const completed = await db
    .select({
      challengerId: penaltyMatches.challengerId,
      opponentId: penaltyMatches.opponentId,
      winnerId: penaltyMatches.winnerId,
      mode: penaltyMatches.mode,
    })
    .from(penaltyMatches)
    .where(eq(penaltyMatches.status, PENALTY_STATUS.COMPLETED));

  const stats = new Map<
    number,
    { wins: number; losses: number; draws: number; games: number }
  >();

  function bump(id: number, kind: "win" | "loss" | "draw") {
    const cur = stats.get(id) ?? { wins: 0, losses: 0, draws: 0, games: 0 };
    cur.games += 1;
    if (kind === "win") cur.wins += 1;
    else if (kind === "loss") cur.losses += 1;
    else cur.draws += 1;
    stats.set(id, cur);
  }

  for (const row of completed) {
    const participants = [row.challengerId];
    if (row.opponentId != null) participants.push(row.opponentId);

    for (const id of participants) {
      if (row.winnerId == null) bump(id, "draw");
      else if (row.winnerId === id) bump(id, "win");
      else bump(id, "loss");
    }
  }

  if (stats.size === 0) return [];

  const ids = [...stats.keys()];
  const people = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      avatarUrl: managers.avatarUrl,
    })
    .from(managers)
    .where(inArray(managers.id, ids));

  const rows: PenaltyLeaderboardRow[] = people.map((p) => {
    const s = stats.get(p.id)!;
    return {
      managerId: p.id,
      displayName: p.displayName,
      avatarUrl: p.avatarUrl,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      gamesPlayed: s.games,
      winRate: s.games > 0 ? s.wins / s.games : 0,
      rank: 0,
    };
  });

  rows.sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.winRate !== a.winRate) return b.winRate - a.winRate;
    return b.gamesPlayed - a.gamesPlayed;
  });

  return rows.map((row, i) => ({ ...row, rank: i + 1 }));
}

export async function getPenaltiesBoard(managerId: number | null) {
  const [managersList, pending, active, history, leaderboard] =
    await Promise.all([
      listPenaltyManagers(),
      managerId != null ? listPendingForManager(managerId) : Promise.resolve([]),
      managerId != null ? listActiveForManager(managerId) : Promise.resolve([]),
      getPenaltyHistory({ managerId, mineOnly: false }),
      getPenaltyLeaderboard(),
    ]);

  return {
    managers: managersList,
    pending,
    active,
    history,
    leaderboard,
  };
}
