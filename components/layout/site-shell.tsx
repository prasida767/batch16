import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { DressingRoomLayout } from "@/components/chat/dressing-room-layout";
import { CelebrationHost } from "@/components/layout/celebration-host";
import { Navbar } from "@/components/layout/navbar";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/motion/page-transition";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { getShellAuth } from "@/lib/auth/shell";
import { getActiveGwWinnerCelebration } from "@/lib/league/celebration";

async function CelebrationSlot() {
  const celebration = await getActiveGwWinnerCelebration();
  if (!celebration) return null;
  return <CelebrationHost celebration={celebration} />;
}

async function currentPathname() {
  const h = await headers();
  return h.get("x-pathname") ?? "";
}

export async function SiteShell({ children }: { children: ReactNode }) {
  const auth = await getShellAuth();
  const authLabel =
    auth.manager?.displayName ?? (auth.signedIn ? auth.email : null);
  const managerId = auth.manager?.managerId ?? null;
  const needsClaim = auth.signedIn && !auth.verified;

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
          <CelebrationSlot />
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
