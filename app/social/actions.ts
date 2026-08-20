"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/admin/shared";
import { getAuthUser, requireAdmin } from "@/lib/auth/session";
import { isAdminEmail } from "@/lib/auth/admin";
import {
  getActingManagerId,
  listChallengeManagers,
} from "@/lib/challenges";
import { isDatabaseConfigured } from "@/lib/db";
import {
  createWallPost,
  deleteAward,
  generateAwardsForGameweek,
  getLatestAwardsPreview,
  listAwardGameweeks,
  listAwardsForGameweek,
  listRecentWallPosts,
  listWallFeed,
  saveAward,
  softDeleteWallPost,
} from "@/lib/social";
import { getLeagueSnapshot } from "@/lib/league/queries";
import { buildWeeklyGameweeks } from "@/lib/league/weekly";
import { leagueRosterRows } from "@/lib/fpl";

function revalidateSocial() {
  revalidatePath("/");
  revalidatePath("/league");
  revalidatePath("/awards");
  revalidatePath("/wall");
  revalidatePath("/activity");
  revalidatePath("/admin/awards");
  revalidatePath("/admin/wall");
}

async function requireAdminAction(): Promise<ActionResult | null> {
  const user = await getAuthUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    return { ok: false, message: "Unauthorized." };
  }
  return null;
}

export async function getAwardsPageData(selectedGw?: number) {
  if (!isDatabaseConfigured()) return { kind: "no_db" as const };

  const snapshot = await getLeagueSnapshot();
  let finishedGws: number[] = [];
  if (snapshot.kind === "ok") {
    const weeks = buildWeeklyGameweeks(
      leagueRosterRows(snapshot.data.standings),
      snapshot.data.bootstrap,
      snapshot.data.histories,
      snapshot.data.db.weekly,
    );
    finishedGws = weeks
      .filter((w) => w.finished)
      .map((w) => w.gameweek)
      .sort((a, b) => b - a);
  }

  const storedGws = await listAwardGameweeks();
  const gameweeks = [
    ...new Set([...storedGws, ...finishedGws]),
  ].sort((a, b) => b - a);

  const gameweek =
    selectedGw && gameweeks.includes(selectedGw)
      ? selectedGw
      : (gameweeks[0] ?? null);

  const awards = gameweek != null ? await listAwardsForGameweek(gameweek) : [];

  return {
    kind: "ok" as const,
    gameweeks,
    gameweek,
    awards,
    hasLeague: snapshot.kind === "ok",
  };
}

export async function generateAwardsAction(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const gameweek = Number(formData.get("gameweek"));
    const count = await generateAwardsForGameweek(gameweek);
    revalidateSocial();
    return {
      ok: true,
      message: `Generated ${count} awards for GW${gameweek}.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't generate awards.",
    };
  }
}

export async function saveAwardAction(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    const idRaw = String(formData.get("id") ?? "").trim();
    const gameweek = Number(formData.get("gameweek"));
    const title = String(formData.get("title") ?? "").trim().slice(0, 120);
    const managerRaw = String(formData.get("managerId") ?? "").trim();
    const detail = String(formData.get("detail") ?? "").trim().slice(0, 500);
    const awardKey = String(formData.get("awardKey") ?? "custom")
      .trim()
      .slice(0, 64);

    await saveAward({
      id: idRaw ? Number(idRaw) : undefined,
      gameweek,
      awardKey,
      title,
      managerId: managerRaw ? Number(managerRaw) : null,
      detail: detail || null,
    });
    revalidateSocial();
    return { ok: true, message: "Award saved." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn't save award.",
    };
  }
}

export async function deleteAwardAction(
  formData: FormData,
): Promise<ActionResult> {
  const denied = await requireAdminAction();
  if (denied) return denied;
  try {
    await deleteAward(Number(formData.get("id")));
    revalidateSocial();
    return { ok: true, message: "Award deleted." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't delete award.",
    };
  }
}

export async function getAdminAwardsData(gameweek?: number) {
  await requireAdmin();
  const page = await getAwardsPageData(gameweek);
  if (page.kind !== "ok") return page;
  const managers = await listChallengeManagers();
  return { ...page, managers };
}

export async function getWallPageData() {
  if (!isDatabaseConfigured()) return { kind: "no_db" as const };
  const [actingManagerId, managers, posts] = await Promise.all([
    getActingManagerId(),
    listChallengeManagers(),
    listWallFeed(30),
  ]);
  const acting =
    actingManagerId != null
      ? managers.find((m) => m.id === actingManagerId) ?? null
      : null;
  return {
    kind: "ok" as const,
    actingManagerId,
    acting,
    managers,
    posts,
  };
}

export async function selectWallIdentity(
  _formData: FormData,
): Promise<ActionResult> {
  return {
    ok: false,
    message: "Register and verify your manager account at /auth/register instead.",
  };
}

export async function postWallMessage(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const managerId = await getActingManagerId();
    if (managerId == null) {
      return { ok: false, message: "Verify your manager account first." };
    }
    const body = String(formData.get("body") ?? "");
    const parentRaw = String(formData.get("parentId") ?? "").trim();
    await createWallPost({
      managerId,
      body,
      parentId: parentRaw ? Number(parentRaw) : null,
    });
    revalidateSocial();
    return { ok: true, message: "Posted (+3 activity points)." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Couldn't post.",
    };
  }
}

export async function deleteWallPostAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    const actorManagerId = await getActingManagerId();
    const auth = await getAuthUser();
    const asAdmin = Boolean(auth?.email && isAdminEmail(auth.email));
    if (actorManagerId == null && !asAdmin) {
      return { ok: false, message: "Verify your manager account first." };
    }
    await softDeleteWallPost({
      id: Number(formData.get("id")),
      actorManagerId,
      asAdmin,
    });
    revalidateSocial();
    return { ok: true, message: "Post removed." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't delete post.",
    };
  }
}

export async function getAdminWallData() {
  await requireAdmin();
  if (!isDatabaseConfigured()) return { kind: "no_db" as const };
  const posts = await listWallFeed(50);
  return { kind: "ok" as const, posts };
}

export async function getDashboardSocialExtras() {
  if (!isDatabaseConfigured()) {
    return {
      awards: null,
      wall: [] as Awaited<ReturnType<typeof listRecentWallPosts>>,
    };
  }
  const [awards, wall] = await Promise.all([
    getLatestAwardsPreview(4).catch(() => null),
    listRecentWallPosts(5).catch(() => []),
  ]);
  return { awards, wall };
}
