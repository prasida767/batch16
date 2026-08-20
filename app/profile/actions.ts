"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import type { ActionResult } from "@/lib/admin/shared";
import { getVerifiedManager } from "@/lib/auth/session";
import { AVATAR_VARIANT_COUNT } from "@/lib/avatars/clubs";
import { getDb, isDatabaseConfigured, managers } from "@/lib/db";
import { getBootstrapStatic } from "@/lib/fpl";
import { mergeClubsFromBootstrap } from "@/lib/avatars/clubs";

export async function getProfilePageData() {
  if (!isDatabaseConfigured()) {
    return { kind: "no_db" as const };
  }

  const verified = await getVerifiedManager();
  if (!verified) {
    return { kind: "unverified" as const };
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      supportedTeamId: managers.supportedTeamId,
      avatarVariant: managers.avatarVariant,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers)
    .where(eq(managers.id, verified.managerId))
    .limit(1);

  if (!row) {
    return { kind: "unverified" as const };
  }

  let clubs = mergeClubsFromBootstrap([]);
  try {
    const bootstrap = await getBootstrapStatic();
    clubs = mergeClubsFromBootstrap(bootstrap.teams);
  } catch {
    // static fallback
  }

  return {
    kind: "ok" as const,
    email: verified.email,
    manager: row,
    clubs,
  };
}

export async function updateAvatarAction(
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!isDatabaseConfigured()) {
      return { ok: false, message: "Database isn't configured." };
    }
    const verified = await getVerifiedManager();
    if (!verified) {
      return { ok: false, message: "Verify your manager account first." };
    }

    const supportedTeamId = Number(formData.get("supportedTeamId"));
    const avatarVariant = Number(formData.get("avatarVariant"));
    if (!Number.isInteger(supportedTeamId) || supportedTeamId <= 0) {
      return { ok: false, message: "Pick a Premier League club." };
    }
    if (!Number.isInteger(avatarVariant)) {
      return { ok: false, message: "Pick an avatar style." };
    }

    const variant =
      ((avatarVariant % AVATAR_VARIANT_COUNT) + AVATAR_VARIANT_COUNT) %
      AVATAR_VARIANT_COUNT;

    let teamCode: number | null = null;
    try {
      const bootstrap = await getBootstrapStatic();
      const clubs = mergeClubsFromBootstrap(bootstrap.teams);
      const club = clubs.find((c) => c.id === supportedTeamId);
      teamCode = club?.code ?? null;
    } catch {
      const { CLUB_DEFINITIONS } = await import("@/lib/avatars/clubs");
      teamCode =
        CLUB_DEFINITIONS.find((c) => c.id === supportedTeamId)?.code ?? null;
    }
    if (teamCode == null) {
      return { ok: false, message: "Unknown Premier League club." };
    }

    const db = getDb();
    await db
      .update(managers)
      .set({
        supportedTeamId,
        supportedTeamCode: teamCode,
        avatarVariant: variant,
      })
      .where(eq(managers.id, verified.managerId));

    revalidatePath("/profile");
    revalidatePath("/league");
    revalidatePath("/managers");
    revalidatePath("/live");

    return { ok: true, message: "Avatar updated." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Couldn't update avatar.",
    };
  }
}
