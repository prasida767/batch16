import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect, unstable_rethrow } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { SignedInShell } from "@/components/layout/signed-in-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/motion/page-transition";
import { claimPath, isPublicPath } from "@/lib/auth/paths";
import { getAuthStatus } from "@/lib/auth/session";
import { getActiveGwWinnerCelebration } from "@/lib/league/celebration";

async function currentPathname() {
  try {
    const h = await headers();
    return h.get("x-pathname") ?? "";
  } catch (error) {
    unstable_rethrow(error);
    return "";
  }
}

const SIGNED_OUT = {
  signedIn: false,
  email: null,
  verified: false,
  claimState: "unknown" as const,
  isAdmin: false,
  manager: null,
};

export async function SiteShell({ children }: { children: ReactNode }) {
  let auth: Awaited<ReturnType<typeof getAuthStatus>> = SIGNED_OUT;
  try {
    auth = await getAuthStatus();
  } catch (error) {
    unstable_rethrow(error);
    console.error("[shell] auth failed", error);
  }

  const authLabel =
    auth.manager?.displayName ?? (auth.signedIn ? auth.email : null);
  const managerId = auth.manager?.managerId ?? null;
  const needsClaim = auth.signedIn && auth.claimState === "unlinked";

  const path = await currentPathname();
  const cinematic =
    path === "/onboarding/recap" || path.startsWith("/onboarding/recap");

  if (needsClaim && path && !isPublicPath(path) && !cinematic) {
    redirect(claimPath(path.startsWith("/") ? path : null));
  }

  let celebration = null;
  if (auth.signedIn && !cinematic && !path.startsWith("/auth")) {
    try {
      celebration = await getActiveGwWinnerCelebration();
    } catch (error) {
      unstable_rethrow(error);
      celebration = null;
    }
  }

  if (!auth.signedIn) {
    return (
      <div className="app-canvas flex min-h-screen flex-col">
        <PublicHeader />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <SignedInShell
      authLabel={authLabel}
      isAdmin={auth.isAdmin}
      managerId={managerId}
      managerName={auth.manager?.displayName ?? null}
      needsClaim={needsClaim}
      celebration={celebration}
    >
      {children}
    </SignedInShell>
  );
}
