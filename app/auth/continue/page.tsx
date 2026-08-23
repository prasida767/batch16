import { redirect } from "next/navigation";
import { afterAuthPath, loginPath, safeNextPath } from "@/lib/auth/paths";
import { getAuthStatus } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Lightweight post-login hop: session cookies are already set.
 * Sends unverified users to claim, verified users to /league (or `next`).
 */
export default async function AuthContinuePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const auth = await getAuthStatus();

  if (!auth.signedIn) {
    redirect(loginPath(next));
  }

  redirect(
    afterAuthPath({
      verified: auth.verified,
      claimState: auth.claimState,
      next,
    }),
  );
}
