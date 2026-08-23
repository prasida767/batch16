import "server-only";

import { cache } from "react";
import { eq, isNotNull } from "drizzle-orm";
import { unstable_rethrow } from "next/navigation";
import { getDb, isDatabaseConfigured, managerAccounts, managers } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/auth/admin";
import type { ClaimState } from "@/lib/auth/paths";

export type VerifiedManager = {
  userId: string;
  email: string;
  managerId: number;
  displayName: string;
  fplEntryId: number;
};

export type ManagerLookup =
  | { kind: "signed_out" }
  | { kind: "verified"; manager: VerifiedManager }
  | { kind: "unlinked" }
  | { kind: "unavailable" };

export const getAuthUser = cache(async () => {
  try {
    if (!isSupabaseConfigured()) return null;
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return data.user;
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth] getAuthUser failed", error);
    return null;
  }
});

export const lookupVerifiedManager = cache(async (): Promise<ManagerLookup> => {
  try {
    const user = await getAuthUser();
    if (!user) return { kind: "signed_out" };
    if (!isDatabaseConfigured()) return { kind: "unavailable" };

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
    unstable_rethrow(error);
    console.error("[auth] lookupVerifiedManager failed", error);
    return { kind: "unavailable" };
  }
});

/** Session user linked to a verified league manager, or null. */
export async function getVerifiedManager(): Promise<VerifiedManager | null> {
  const lookup = await lookupVerifiedManager();
  return lookup.kind === "verified" ? lookup.manager : null;
}

export const getAuthStatus = cache(async (): Promise<{
  signedIn: boolean;
  email: string | null;
  verified: boolean;
  claimState: ClaimState;
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
        claimState: "unlinked",
        isAdmin: false,
        manager: null,
      };
    }

    const lookup = await lookupVerifiedManager();
    const manager = lookup.kind === "verified" ? lookup.manager : null;
    const email = user.email ?? manager?.email ?? null;
    const claimState: ClaimState =
      lookup.kind === "verified"
        ? "linked"
        : lookup.kind === "unavailable"
          ? "unknown"
          : "unlinked";

    return {
      signedIn: true,
      email,
      verified: Boolean(manager),
      claimState,
      isAdmin: isAdminEmail(email),
      manager,
    };
  } catch (error) {
    unstable_rethrow(error);
    console.error("[auth] getAuthStatus failed", error);
    return {
      signedIn: false,
      email: null,
      verified: false,
      claimState: "unknown",
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
    unstable_rethrow(error);
    console.error("[auth] listClaimableManagers failed", error);
    return [];
  }
}
