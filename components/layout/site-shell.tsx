import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { DressingRoomLayout } from "@/components/chat/dressing-room-layout";
import { GwWinnerCelebration } from "@/components/layout/gw-winner-celebration";
import { Navbar } from "@/components/layout/navbar";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/motion/page-transition";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { logAppError } from "@/lib/errors/log";
import { getAuthStatus } from "@/lib/auth/session";
import { getActiveGwWinnerCelebration } from "@/lib/league/celebration";

async function currentPathname() {
  try {
    const h = await headers();
    return h.get("x-pathname") ?? "";
  } catch {
    return "";
  }
}

async function CelebrationSlot() {
  try {
    const celebration = await getActiveGwWinnerCelebration();
    if (!celebration) return null;
    return <GwWinnerCelebration celebration={celebration} />;
  } catch (error) {
    logAppError("celebration", error);
    return null;
  }
}

function HeaderPlaceholder() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/60 bg-background/75" />
  );
}

function ShellFallback({ children }: { children: ReactNode }) {
  return (
    <div className="app-canvas flex min-h-screen flex-col">
      <HeaderPlaceholder />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/** Sync wrapper so the root layout can stream HTML before auth/DB resolve. */
export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ShellFallback>{children}</ShellFallback>}>
      <ResolvedSiteShell>{children}</ResolvedSiteShell>
    </Suspense>
  );
}

async function ResolvedSiteShell({ children }: { children: ReactNode }) {
  let auth: Awaited<ReturnType<typeof getAuthStatus>>;
  try {
    auth = await getAuthStatus();
  } catch (error) {
    logAppError("shell", error);
    auth = {
      signedIn: false,
      email: null,
      verified: false,
      claim: "unknown",
      isAdmin: false,
      manager: null,
    };
  }

  const authLabel =
    auth.manager?.displayName ?? (auth.signedIn ? auth.email : null);
  const managerId = auth.manager?.managerId ?? null;
  const needsClaim = auth.claim === "unlinked";

  const path = await currentPathname();
  const cinematic =
    path === "/onboarding/recap" || path.startsWith("/onboarding/recap");

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

  if (cinematic) {
    return <>{children}</>;
  }

  return (
    <NotificationProvider managerId={managerId}>
      <div className="app-canvas flex min-h-screen flex-col">
        <Navbar
          authLabel={authLabel}
          isAdmin={auth.isAdmin}
          showNotifications={managerId != null}
          needsClaim={needsClaim}
        />
        {needsClaim && path !== "/auth/claim" ? (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-950 dark:text-amber-100">
            You&apos;re signed in but still{" "}
            <span className="font-semibold">Unverified</span>.{" "}
            <Link
              href="/auth/claim"
              className="font-semibold underline underline-offset-2"
            >
              Link your FPL manager
            </Link>{" "}
            to unlock chat, Baaji, and notifications.
          </div>
        ) : null}
        <Suspense fallback={null}>
          <FeatureErrorBoundary feature="celebration" variant="silent">
            <CelebrationSlot />
          </FeatureErrorBoundary>
        </Suspense>
        <div className="flex min-h-0 flex-1 flex-col">
          <DressingRoomLayout
            managerId={managerId}
            managerName={auth.manager?.displayName ?? null}
            isAdmin={auth.isAdmin}
          >
            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
                <PageTransition>{children}</PageTransition>
              </div>
            </main>
          </DressingRoomLayout>
        </div>
        <SiteFooter />
      </div>
    </NotificationProvider>
  );
}
