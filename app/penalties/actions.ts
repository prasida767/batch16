"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/admin/shared";
import { getActingManagerId } from "@/lib/challenges/identity";
import { isDatabaseConfigured } from "@/lib/db";
import {
  cancelPenaltyChallenge,
  createPenaltyChallenge,
  getPenaltiesBoard,
  getPenaltyHistory,
  getPenaltyMatch,
  parseDirection,
  respondToPenaltyChallenge,
  startSoloMatch,
  submitMultiplayerChoice,
  submitSoloKick,
} from "@/lib/penalties";

function revalidatePenaltyPaths() {
  revalidatePath("/penalties");
}

export async function getPenaltiesPageData() {
  if (!isDatabaseConfigured()) {
    return { kind: "no_db" as const };
  }

  const actingManagerId = await getActingManagerId();
  const board = await getPenaltiesBoard(actingManagerId);
  const acting =
    actingManagerId != null
      ? board.managers.find((m) => m.id === actingManagerId) ?? null
      : null;

  return {
    kind: "ok" as const,
    actingManagerId,
    acting,
    ...board,
  };
}

export async function startSoloAction(): Promise<
  ActionResult & {
    matchId?: number;
    match?: Awaited<ReturnType<typeof getPenaltyMatch>>;
  }
> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const match = await startSoloMatch(managerId);
    revalidatePenaltyPaths();
    return {
      ok: true,
      message: "Solo match started — pick a direction!",
      matchId: match.id,
      match,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not start solo.",
    };
  }
}

export async function challengeManagerAction(
  formData: FormData,
): Promise<ActionResult & { matchId?: number }> {
  try {
    const challengerId = await getActingManagerId();
    if (challengerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const opponentId = Number(formData.get("opponentId"));
    if (!Number.isInteger(opponentId) || opponentId <= 0) {
      return { ok: false, message: "Pick a manager to challenge." };
    }
    const match = await createPenaltyChallenge({ challengerId, opponentId });
    revalidatePenaltyPaths();
    return {
      ok: true,
      message: "Challenge sent!",
      matchId: match.id,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not send challenge.",
    };
  }
}

export async function respondChallengeAction(
  formData: FormData,
): Promise<ActionResult & { matchId?: number }> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const matchId = Number(formData.get("matchId"));
    const accept = String(formData.get("accept")) === "true";
    const match = await respondToPenaltyChallenge({
      matchId,
      managerId,
      accept,
    });
    revalidatePenaltyPaths();
    return {
      ok: true,
      message: accept ? "Challenge accepted — play!" : "Challenge declined.",
      matchId: match.id,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not respond.",
    };
  }
}

export async function cancelChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const matchId = Number(formData.get("matchId"));
    await cancelPenaltyChallenge({ matchId, managerId });
    revalidatePenaltyPaths();
    return { ok: true, message: "Challenge cancelled." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Could not cancel.",
    };
  }
}

export async function soloKickAction(
  formData: FormData,
): Promise<
  ActionResult & {
    match?: Awaited<ReturnType<typeof getPenaltyMatch>>;
    lastRound?: Awaited<ReturnType<typeof submitSoloKick>>["lastRound"];
  }
> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const matchId = Number(formData.get("matchId"));
    const choice = parseDirection(formData.get("choice"));
    if (!choice) return { ok: false, message: "Pick Left, Center, or Right." };

    const { match, lastRound } = await submitSoloKick({
      matchId,
      managerId,
      choice,
    });
    revalidatePenaltyPaths();
    return { ok: true, message: lastRound.scored ? "GOAL!" : "Saved!", match, lastRound };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Kick failed.",
    };
  }
}

export async function multiplayerChoiceAction(
  formData: FormData,
): Promise<
  ActionResult & { match?: Awaited<ReturnType<typeof getPenaltyMatch>> }
> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const matchId = Number(formData.get("matchId"));
    const choice = parseDirection(formData.get("choice"));
    if (!choice) return { ok: false, message: "Pick Left, Center, or Right." };

    const match = await submitMultiplayerChoice({
      matchId,
      managerId,
      choice,
    });
    revalidatePenaltyPaths();
    return { ok: true, message: "Choice locked in.", match };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Choice failed.",
    };
  }
}

export async function refreshMatchAction(matchId: number) {
  if (!isDatabaseConfigured()) return null;
  if (!Number.isInteger(matchId) || matchId <= 0) return null;
  const viewerId = await getActingManagerId();
  return getPenaltyMatch(matchId, viewerId);
}

export async function refreshInboxAction() {
  const managerId = await getActingManagerId();
  if (managerId == null || !isDatabaseConfigured()) {
    return { pending: [], active: [] };
  }
  const board = await getPenaltiesBoard(managerId);
  return { pending: board.pending, active: board.active };
}

export async function refreshHistoryAction(mineOnly: boolean) {
  const managerId = await getActingManagerId();
  if (!isDatabaseConfigured()) return [];
  return getPenaltyHistory({ managerId, mineOnly });
}
