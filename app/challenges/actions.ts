"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/admin/shared";
import {
  cancelChallenge,
  createChallenge,
  getActingManagerId,
  getChallengesBoard,
  listAcceptedChallengesForAdmin,
  listAllChallengesForAdmin,
  listChallengeManagers,
  resolveChallenge,
  respondToChallenge,
} from "@/lib/challenges";
import { requireAdmin } from "@/lib/auth/session";
import { isDatabaseConfigured } from "@/lib/db";
import { getCurrentGameweek } from "@/lib/fpl";
import {
  parseChallengeId,
  parseOpponentId,
  parseOptionalGameweek,
  parseStakeNpr,
} from "@/lib/challenges/parse";

function revalidateChallengePaths() {
  revalidatePath("/challenges");
}

export async function getChallengesPageData() {
  if (!isDatabaseConfigured()) {
    return { kind: "no_db" as const };
  }

  try {
    const actingManagerId = await getActingManagerId();
    const managers = await listChallengeManagers();
    const currentGameweek = await getCurrentGameweek().catch(() => null);

    const board = await getChallengesBoard(actingManagerId);
    const acting =
      actingManagerId != null
        ? managers.find((m) => m.id === actingManagerId) ?? null
        : null;

    return {
      kind: "ok" as const,
      actingManagerId,
      acting,
      managers,
      currentGameweek,
      ...board,
    };
  } catch (error) {
    console.error("[baaji] Page data failed", error);
    return {
      kind: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't load Baaji. Try refreshing.",
    };
  }
}

/** @deprecated Cookie identity removed — use /auth/register. */
export async function selectActingManager(
  _formData: FormData,
): Promise<ActionResult> {
  return {
    ok: false,
    message: "Register and verify your manager at /auth/register instead.",
  };
}

export async function createChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const creatorId = await getActingManagerId();
    if (creatorId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }

    const opponentId = parseOpponentId(formData.get("opponentId"));
    if (opponentId == null) {
      return { ok: false, message: "Pick an opponent." };
    }
    const description = String(formData.get("description") ?? "");
    const stake = parseStakeNpr(formData.get("stakeNpr"));
    if (!stake.ok) return { ok: false, message: stake.message };
    const gameweek = parseOptionalGameweek(formData.get("gameweek"));

    await createChallenge({
      creatorId,
      opponentId,
      description,
      stakeNpr: stake.value,
      gameweek,
    });

    revalidateChallengePaths();
    return {
      ok: true,
      message: "Baaji sent (+5 activity points).",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't create baaji.",
    };
  }
}

export async function respondChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actorId = await getActingManagerId();
    if (actorId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const challengeId = parseChallengeId(formData.get("challengeId"));
    if (challengeId == null) {
      return { ok: false, message: "Challenge not found." };
    }
    const accept = String(formData.get("decision")) === "accept";

    await respondToChallenge({ challengeId, actorId, accept });
    revalidateChallengePaths();
    return {
      ok: true,
      message: accept
        ? "Baaji accepted (+5 activity points)."
        : "Darayo — baaji declined.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't update baaji.",
    };
  }
}

export async function resolveChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actorId = await getActingManagerId();
    if (actorId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const challengeId = parseChallengeId(formData.get("challengeId"));
    const winnerId = parseOpponentId(formData.get("winnerId"));
    if (challengeId == null) {
      return { ok: false, message: "Challenge not found." };
    }
    if (winnerId == null) {
      return { ok: false, message: "Pick a winner." };
    }

    await resolveChallenge({ challengeId, actorId, winnerId });
    revalidateChallengePaths();
    return { ok: true, message: "Winner recorded." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't resolve baaji.",
    };
  }
}

export async function cancelChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actorId = await getActingManagerId();
    if (actorId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const challengeId = parseChallengeId(formData.get("challengeId"));
    if (challengeId == null) {
      return { ok: false, message: "Challenge not found." };
    }
    await cancelChallenge({ challengeId, actorId });
    revalidateChallengePaths();
    return { ok: true, message: "Baaji cancelled." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't cancel baaji.",
    };
  }
}

export async function getAdminChallengesData() {
  await requireAdmin();
  if (!isDatabaseConfigured()) return { kind: "no_db" as const };
  try {
    const accepted = await listAcceptedChallengesForAdmin();
    const season = await listAllChallengesForAdmin();
    return { kind: "ok" as const, accepted, season };
  } catch (error) {
    console.error("[admin] Baaji list failed", error);
    return {
      kind: "error" as const,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't load Baaji. Try refreshing.",
    };
  }
}

export async function adminResolveChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const challengeId = parseChallengeId(formData.get("challengeId"));
    const winnerId = parseOpponentId(formData.get("winnerId"));
    if (challengeId == null || winnerId == null) {
      return { ok: false, message: "Challenge not found or not accepted." };
    }
    const accepted = await listAcceptedChallengesForAdmin();
    const challenge = accepted.find((c) => c.id === challengeId);
    if (!challenge) {
      return { ok: false, message: "Challenge not found or not accepted." };
    }

    await resolveChallenge({
      challengeId,
      actorId: challenge.creatorId,
      winnerId,
      asAdmin: true,
    });
    revalidateChallengePaths();
    return { ok: true, message: "Winner recorded by admin." };
  } catch (error) {
    // Let Next.js redirects (non-admin) bubble.
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't resolve challenge.",
    };
  }
}
