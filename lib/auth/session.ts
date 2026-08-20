import "server-only";

import { cache } from "react";
import { eq, isNotNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured, managerAccounts, managers } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isAdminEmail } from "@/lib/auth/admin";

export type VerifiedManager = {
  userId: string;
  email: string;
  managerId: number;
  displayName: string;
  fplEntryId: number;
};

export const getAuthUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

/** Session user linked to a verified league manager, or null. */
export const getVerifiedManager = cache(
  async (): Promise<VerifiedManager | null> => {
    const user = await getAuthUser();
    if (!user || !isDatabaseConfigured()) return null;

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

    if (!row || row.fplEntryId == null) return null;

    return {
      userId: row.userId,
      email: row.email,
      managerId: row.managerId,
      displayName: row.displayName,
      fplEntryId: row.fplEntryId,
    };
  },
);

export const getAuthStatus = cache(
  async (): Promise<{
    signedIn: boolean;
    email: string | null;
    verified: boolean;
    isAdmin: boolean;
    manager: VerifiedManager | null;
  }> => {
    const user = await getAuthUser();
    if (!user) {
      return {
        signedIn: false,
        email: null,
        verified: false,
        isAdmin: false,
        manager: null,
      };
    }
    const manager = await getVerifiedManager();
    const email = user.email ?? manager?.email ?? null;
    return {
      signedIn: true,
      email,
      verified: Boolean(manager),
      isAdmin: isAdminEmail(email),
      manager,
    };
  },
);

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
}
