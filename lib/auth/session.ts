import "server-only";

import { cache } from "react";
import { eq, isNotNull } from "drizzle-orm";
import { raceTimeout } from "@/lib/async/timeout";
import { getDb, isDatabaseConfigured, managerAccounts, managers } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/auth/admin";

const AUTH_WAIT_MS = 4000;

export type VerifiedManager = {
  userId: string;
  email: string;
  managerId: number;
  displayName: string;
  fplEntryId: number;
};

/** Do not treat a slow/failed DB read as "unlinked" — that re-prompts verified users. */
export type ClaimState = "linked" | "unlinked" | "unknown";

type ManagerLookup =
  | { kind: "verified"; manager: VerifiedManager }
  | { kind: "unlinked" }
  | { kind: "unavailable" };

export const getAuthUser = cache(async () => {
  try {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    return await raceTimeout(
      supabase.auth.getUser().then(({ data, error }) => {
        if (error || !data.user) return null;
        return data.user;
      }),
      AUTH_WAIT_MS,
      null,
      "getAuthUser",
    );
  } catch (error) {
    console.error("[auth] getAuthUser failed", error);
    return null;
  }
});

const lookupVerifiedManager = cache(async (): Promise<ManagerLookup> => {
  const user = await getAuthUser();
  if (!user) return { kind: "unlinked" };
  if (!isDatabaseConfigured()) return { kind: "unavailable" };

  try {
    const db = getDb();
    const [row] = await db
      .select({
        userId: managerAccounts.userId,
        email: managerAccounts.email,
        managerId: managerAccounts.managerId,
        displayName: managers.displayName,
        fplEntryId: managers.fplEntryId,
      })
      .from(managerAccounts)
      .innerJoin(managers, eq(managers.id, managerAccounts.managerId))
      .where(eq(managerAccounts.userId, user.id))
      .limit(1);

    if (!row || row.fplEntryId == null) return { kind: "unlinked" };

    return {
      kind: "verified",
      manager: {
        userId: row.userId,
        email: row.email,
        managerId: row.managerId,
        displayName: row.displayName,
        fplEntryId: row.fplEntryId,
      },
    };
  } catch (error) {
    console.error("[auth] getVerifiedManager failed", error);
    return { kind: "unavailable" };
  }
});

/** Session user linked to a verified league manager, or null. */
export const getVerifiedManager = cache(
  async (): Promise<VerifiedManager | null> => {
    const lookup = await lookupVerifiedManager();
    return lookup.kind === "verified" ? lookup.manager : null;
  },
);

export const getAuthStatus = cache(async (): Promise<{
  signedIn: boolean;
  email: string | null;
  verified: boolean;
  claim: ClaimState;
  isAdmin: boolean;
  manager: VerifiedManager | null;
}> => {
  try {
    const user = await getAuthUser();
    if (!user) {
      return {
        signedIn: false,
        email: null,
        verified: false,
        claim: "unlinked",
        isAdmin: false,
        manager: null,
      };
    }
    const lookup = await lookupVerifiedManager();
    const manager = lookup.kind === "verified" ? lookup.manager : null;
    const claim: ClaimState =
      lookup.kind === "verified"
        ? "linked"
        : lookup.kind === "unlinked"
          ? "unlinked"
          : "unknown";
    return {
      signedIn: true,
      email: user.email ?? manager?.email ?? null,
      verified: lookup.kind === "verified",
      claim,
      isAdmin: isAdminEmail(user.email),
      manager,
    };
  } catch (error) {
    console.error("[auth] getAuthStatus failed", error);
    return {
      signedIn: false,
      email: null,
      verified: false,
      claim: "unknown",
      isAdmin: false,
      manager: null,
    };
  }
});

/** Redirect non-admins away from admin routes. */
export async function requireAdmin() {
  const { redirect } = await import("next/navigation");
  const user = await getAuthUser();
  if (!user?.email || !isAdminEmail(user.email)) {
    redirect("/league");
  }
  return user;
}

export async function listClaimableManagers() {
  try {
    const db = getDb();
    const claimed = await db
      .select({ managerId: managerAccounts.managerId })
      .from(managerAccounts);
    const claimedIds = new Set(claimed.map((r) => r.managerId));

    const rows = await db
      .select({
        id: managers.id,
        displayName: managers.displayName,
        fplEntryId: managers.fplEntryId,
        canonicalKey: managers.canonicalKey,
      })
      .from(managers)
      .where(isNotNull(managers.fplEntryId))
      .orderBy(managers.displayName);

    return rows.filter((row) => !claimedIds.has(row.id));
  } catch (error) {
    console.error("[auth] listClaimableManagers failed", error);
    return [];
  }
}
