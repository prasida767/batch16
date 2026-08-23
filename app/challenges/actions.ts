"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/admin/shared";
import {
  autoResolveFinishedBaajis,
  cancelChallenge,
  createChallenge,
  getActingManagerId,
  getChallengesBoard,
  listAllChallengesForAdmin,
  listChallengeManagers,
  resolveChallenge,
  respondToChallenge,
} from "@/lib/challenges";
import { getAuthStatus, requireAdmin } from "@/lib/auth/session";
import { parsePositiveInt, parseStakeNpr, CHALLENGE_STATUS } from "@/lib/challenges/types";
import { isDatabaseConfigured } from "@/lib/db";
import { getCurrentGameweek } from "@/lib/fpl";

function revalidateChallengePaths() {
  revalidatePath("/challenges");
  revalidatePath("/activity");
  revalidatePath("/admin/challenges");
  revalidatePath("/admin/activity");
}

export async function getChallengesPageData() {
  if (!isDatabaseConfigured()) {
    return { kind: "no_db" as const };
  }

  try {
    const currentGameweekPromise = getCurrentGameweek().catch(() => null);
    const auth = await getAuthStatus();
    const actingManagerId = auth.manager?.managerId ?? null;

    await autoResolveFinishedBaajis();
    const managers = await listChallengeManagers();
    const board = await getChallengesBoard(actingManagerId);
    const currentGameweek = await currentGameweekPromise;

    const acting =
      actingManagerId != null
        ? (managers.find((m) => m.id === actingManagerId) ??
          (auth.manager
            ? {
                id: auth.manager.managerId,
                displayName: auth.manager.displayName,
                fplEntryId: auth.manager.fplEntryId,
              }
            : null))
        : null;

    return {
      kind: "ok" as const,
      signedIn: auth.signedIn,
      actingManagerId,
      acting,
      managers,
      currentGameweek,
      ...board,
    };
  } catch (error) {
    console.error("[baaji] page data failed", error);
    return {
      kind: "error" as const,
      message:
        error instanceof Error ? error.message : "Couldn't load Baaji right now.",
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

    const opponentId = parsePositiveInt(formData.get("opponentId"));
    if (opponentId == null) {
      return { ok: false, message: "Pick a verified manager to challenge." };
    }

    const description = String(formData.get("description") ?? "");
    const stakeNpr = parseStakeNpr(formData.get("stakeNpr"));
    const gameweek = parsePositiveInt(formData.get("gameweek"));

    await createChallenge({
      creatorId,
      opponentId,
      description,
      stakeNpr,
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
    const challengeId = parsePositiveInt(formData.get("challengeId"));
    if (challengeId == null) {
      return { ok: false, message: "Invalid baaji." };
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
    const challengeId = parsePositiveInt(formData.get("challengeId"));
    const winnerId = parsePositiveInt(formData.get("winnerId"));
    if (challengeId == null || winnerId == null) {
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
    const challengeId = parsePositiveInt(formData.get("challengeId"));
    if (challengeId == null) {
      return { ok: false, message: "Invalid baaji." };
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
  try {
    await requireAdmin();
    if (!isDatabaseConfigured()) return { kind: "no_db" as const };
    await autoResolveFinishedBaajis();
    const season = await listAllChallengesForAdmin();
    const accepted = season.filter(
      (row) => row.status === CHALLENGE_STATUS.ACCEPTED,
    );
    return { kind: "ok" as const, accepted, season };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[baaji] admin data failed", error);
    return {
      kind: "error" as const,
      message:
        error instanceof Error ? error.message : "Couldn't load Baaji admin.",
    };
  }
}

export async function adminResolveChallengeAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin();
    const challengeId = parsePositiveInt(formData.get("challengeId"));
    const winnerId = parsePositiveInt(formData.get("winnerId"));
    if (challengeId == null || winnerId == null) {
      return { ok: false, message: "Pick a winner." };
    }

    const season = await listAllChallengesForAdmin();
    const challenge = season.find(
      (row) =>
        row.id === challengeId && row.status === CHALLENGE_STATUS.ACCEPTED,
    );
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
