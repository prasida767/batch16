import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { lookupVerifiedManagerForUser, type VerifiedManager } from "@/lib/auth/session";

export const AUTH_MANAGER_CACHE_TAG = "auth-manager";

export type ShellAuth = {
  signedIn: boolean;
  email: string | null;
  verified: boolean;
  isAdmin: boolean;
  manager: VerifiedManager | null;
  /** True when Postgres failed — not the same as "never linked". */
  managerLookupFailed: boolean;
};

/**
 * Layout chrome: identity comes from middleware headers (already called getUser).
 * Successful manager lookups are cached 60s so tab switches do not hit Postgres.
 * Timeouts/errors are NOT cached, so a slow first connect cannot stick as Unverified.
 */
export const getShellAuth = cache(async (): Promise<ShellAuth> => {
  const h = await headers();
  const signedIn = h.get("x-signed-in") === "1";
  const email = h.get("x-user-email");
  const userId = h.get("x-user-id");
  const isAdmin = h.get("x-is-admin") === "1";

  if (!signedIn) {
    return {
      signedIn: false,
      email: null,
      verified: false,
      isAdmin: false,
      manager: null,
      managerLookupFailed: false,
    };
  }

  let manager: VerifiedManager | null = null;
  let managerLookupFailed = false;
  if (userId != null && userId.length > 0) {
    try {
      manager = await getCachedManagerForUser(userId);
    } catch {
      managerLookupFailed = true;
    }
  }

  return {
    signedIn: true,
    email: email || manager?.email || null,
    verified: Boolean(manager),
    isAdmin,
    manager,
    managerLookupFailed,
  };
});

function getCachedManagerForUser(userId: string) {
  return unstable_cache(
    async (): Promise<VerifiedManager | null> =>
      lookupVerifiedManagerForUser(userId),
    ["shell-manager-v2", userId],
    { revalidate: 60, tags: [AUTH_MANAGER_CACHE_TAG] },
  )();
}
