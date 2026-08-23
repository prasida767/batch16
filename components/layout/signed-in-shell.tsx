"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DressingRoomLayout } from "@/components/chat/dressing-room-layout";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { GwWinnerCelebration } from "@/components/layout/gw-winner-celebration";
import { Navbar } from "@/components/layout/navbar";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/motion/page-transition";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import type { GwWinnerCelebration as GwWinnerCelebrationData } from "@/lib/league/celebration";

type ChromeProps = {
  authLabel: string | null;
  isAdmin: boolean;
  managerId: number | null;
  managerName: string | null;
  needsClaim: boolean;
  celebration: GwWinnerCelebrationData | null;
  showNotifications: boolean;
  children: ReactNode;
};

function AppFrame({
  authLabel,
  isAdmin,
  managerId,
  managerName,
  needsClaim,
  celebration,
  showNotifications,
  children,
}: ChromeProps) {
  const pathname = usePathname() ?? "";

  return (
    <div className="app-canvas flex min-h-screen flex-col">
      <Navbar
        authLabel={authLabel}
        isAdmin={isAdmin}
        showNotifications={showNotifications}
        needsClaim={needsClaim}
      />
      {needsClaim && pathname !== "/auth/claim" ? (
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
      {celebration ? (
        <FeatureErrorBoundary name="celebration" fallback={null}>
          <GwWinnerCelebration celebration={celebration} />
        </FeatureErrorBoundary>
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col">
        <DressingRoomLayout
          managerId={managerId}
          managerName={managerName}
          isAdmin={isAdmin}
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
  );
}

/**
 * Client chrome so the navbar follows the real URL.
 * A server pathname of /auth/continue used to skip the shell and could leave
 * League (and other app pages) with no nav after login.
 */
export function SignedInShell({
  authLabel,
  isAdmin,
  managerId,
  managerName,
  needsClaim,
  celebration,
  children,
}: Omit<ChromeProps, "showNotifications">) {
  const pathname = usePathname() ?? "";
  // Hide chrome only in the client so the shell stays mounted. Skipping it in
  // the server layout (via x-pathname === /auth/continue) left League with no
  // navbar after login — the root layout does not remount on redirect.
  if (
    pathname.startsWith("/onboarding/recap") ||
    pathname.startsWith("/auth/continue")
  ) {
    return <>{children}</>;
  }

  const frameProps = {
    authLabel,
    isAdmin,
    managerId,
    managerName,
    needsClaim,
    celebration,
    children,
  };

  return (
    <FeatureErrorBoundary
      name="notifications-shell"
      fallback={<AppFrame {...frameProps} showNotifications={false} />}
    >
      <NotificationProvider managerId={managerId}>
        <AppFrame
          {...frameProps}
          showNotifications={managerId != null}
        />
      </NotificationProvider>
    </FeatureErrorBoundary>
  );
}
