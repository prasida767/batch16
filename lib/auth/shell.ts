import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { unstable_cache } from "next/cache";
import { withTimeout } from "@/lib/async/timeout";
import { lookupVerifiedManagerForUser, type VerifiedManager } from "@/lib/auth/session";

export const AUTH_MANAGER_CACHE_TAG = "auth-manager";

export type ShellAuth = {
  signedIn: boolean;
  email: string | null;
  verified: boolean;
  isAdmin: boolean;
  manager: VerifiedManager | null;
};

/**
 * Layout chrome: identity comes from middleware headers (already called getUser).
 * Manager row is cached 60s so tab switches do not hit Postgres.
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
    };
  }

  const manager =
    userId != null && userId.length > 0
      ? await getCachedManagerForUser(userId)
      : null;

  return {
    signedIn: true,
    email: email || manager?.email || null,
    verified: Boolean(manager),
    isAdmin,
    manager,
  };
});

function getCachedManagerForUser(userId: string) {
  return unstable_cache(
    async (): Promise<VerifiedManager | null> => {
      try {
        return await withTimeout(
          lookupVerifiedManagerForUser(userId),
          4_000,
          "shell-manager",
        );
      } catch {
        return null;
      }
    },
    ["shell-manager-v1", userId],
    { revalidate: 60, tags: [AUTH_MANAGER_CACHE_TAG] },
  )();
}
