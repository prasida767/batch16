"use client";

import { useEffect, useState, type ReactNode } from "react";
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

type SessionPayload =
  | {
      kind: "ok";
      authLabel: string | null;
      managerId: number | null;
      managerName: string | null;
      needsClaim: boolean;
      isAdmin: boolean;
      celebration: GwWinnerCelebrationData | null;
    }
  | { kind: "signed_out" }
  | { kind: "error" };

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
 * Manager / celebration load from /api/session after first paint so the
 * Vercel HTML function is not blocked on Postgres.
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
  const [session, setSession] = useState({
    authLabel,
    isAdmin,
    managerId,
    managerName,
    needsClaim,
    celebration,
  });

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/session", { cache: "no-store" })
      .then((response) => response.json() as Promise<SessionPayload>)
      .then((json) => {
        if (cancelled || json.kind !== "ok") return;
        setSession((prev) => ({
          ...prev,
          authLabel: json.authLabel ?? authLabel,
          isAdmin: json.isAdmin,
          managerId: json.managerId,
          managerName: json.managerName,
          needsClaim: json.needsClaim,
        }));
      })
      .catch(() => {
        /* keep middleware chrome */
      });

    void fetch("/api/celebration", { cache: "no-store" })
      .then(
        (response) =>
          response.json() as Promise<{
            kind: string;
            celebration: GwWinnerCelebrationData | null;
          }>,
      )
      .then((json) => {
        if (cancelled || json.kind !== "ok") return;
        setSession((prev) => ({
          ...prev,
          celebration: json.celebration,
        }));
      })
      .catch(() => {
        /* banner is optional */
      });

    return () => {
      cancelled = true;
    };
  }, [authLabel]);

  if (
    pathname.startsWith("/onboarding/recap") ||
    pathname.startsWith("/auth/continue")
  ) {
    return <>{children}</>;
  }

  const frameProps = {
    ...session,
    children,
  };

  return (
    <FeatureErrorBoundary
      name="notifications-shell"
      fallback={<AppFrame {...frameProps} showNotifications={false} />}
    >
      <NotificationProvider managerId={session.managerId}>
        <AppFrame
          {...frameProps}
          showNotifications={session.managerId != null}
        />
      </NotificationProvider>
    </FeatureErrorBoundary>
  );
}
