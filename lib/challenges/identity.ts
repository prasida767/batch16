import { cookies } from "next/headers";
import { eq, isNotNull } from "drizzle-orm";
import { getVerifiedManager } from "@/lib/auth/session";
import { getDb, managers } from "@/lib/db";
import { ACTING_MANAGER_COOKIE } from "@/lib/challenges/types";

/**
 * Verified Supabase-linked manager id.
 * Cookie impersonation is no longer accepted for challenges / wall.
 */
export async function getActingManagerId(): Promise<number | null> {
  const verified = await getVerifiedManager();
  return verified?.managerId ?? null;
}

/** @deprecated Cookie identity removed — use auth claim flow. */
export async function setActingManagerId(_managerId: number | null) {
  const jar = await cookies();
  jar.delete(ACTING_MANAGER_COOKIE);
}

/** League managers that can participate in challenges. */
export async function listChallengeManagers() {
  const db = getDb();
  return db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      fplEntryId: managers.fplEntryId,
      avatarUrl: managers.avatarUrl,
      supportedTeamId: managers.supportedTeamId,
      supportedTeamCode: managers.supportedTeamCode,
      avatarVariant: managers.avatarVariant,
    })
    .from(managers)
    .where(isNotNull(managers.fplEntryId))
    .orderBy(managers.displayName);
}

/** Ensure managerId is an FPL-linked league manager (any participant). */
export async function requireLeagueManager(managerId: number) {
  const db = getDb();
  const [row] = await db
    .select({
      id: managers.id,
      displayName: managers.displayName,
      fplEntryId: managers.fplEntryId,
    })
    .from(managers)
    .where(eq(managers.id, managerId))
    .limit(1);

  if (!row || row.fplEntryId == null) {
    throw new Error("That manager isn't linked to this season's league.");
  }
  return row;
}

/** Ensure the signed-in user is this manager. */
export async function requireActingLeagueManager(managerId: number) {
  const verified = await getVerifiedManager();
  if (!verified || verified.managerId !== managerId) {
    throw new Error("Verify your manager account first.");
  }
  return requireLeagueManager(managerId);
}
