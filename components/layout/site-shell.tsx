import type { ReactNode } from "react";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { PublicHeader } from "@/components/layout/public-header";
import { SignedInShell } from "@/components/layout/signed-in-shell";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/motion/page-transition";

async function requestChrome() {
  try {
    const h = await headers();
    const path = h.get("x-pathname") ?? "";
    const signedIn = h.get("x-signed-in") === "1";
    const rawEmail = h.get("x-user-email");
    let email: string | null = null;
    if (rawEmail) {
      try {
        email = decodeURIComponent(rawEmail);
      } catch {
        email = rawEmail;
      }
    }
    return {
      path,
      signedIn,
      email,
      isAdmin: h.get("x-is-admin") === "1",
    };
  } catch (error) {
    unstable_rethrow(error);
    return { path: "", signedIn: false, email: null, isAdmin: false };
  }
}

/**
 * Chrome only — no Postgres or FPL. Middleware already know if a session
 * cookie exists; waiting on the database here 504s Hobby deploys (10s).
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const { signedIn, email, isAdmin } = await requestChrome();

  if (!signedIn) {
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
      authLabel={email}
      isAdmin={isAdmin}
      managerId={null}
      managerName={null}
      needsClaim={false}
      celebration={null}
    >
      {children}
    </SignedInShell>
  );
}
