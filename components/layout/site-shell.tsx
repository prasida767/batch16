import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { DressingRoomRail } from "@/components/chat/dressing-room-layout";
import { GwWinnerCelebration } from "@/components/layout/gw-winner-celebration";
import { Navbar } from "@/components/layout/navbar";
import { PublicHeader } from "@/components/layout/public-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { PageTransition } from "@/components/motion/page-transition";
import { NotificationProvider } from "@/components/notifications/notification-provider";
import { logAppError } from "@/lib/errors/log";
import { isAdminEmail } from "@/lib/auth/admin";
import { getAuthStatus, getAuthUser } from "@/lib/auth/session";
import { getActiveGwWinnerCelebration } from "@/lib/league/celebration";
import { cn } from "@/lib/utils";

async function currentPathname() {
  try {
    const h = await headers();
    return h.get("x-pathname") ?? "";
  } catch {
    return "";
  }
}

function isCinematic(path: string) {
  return path === "/onboarding/recap" || path.startsWith("/onboarding/recap");
}

function isCompactMain(path: string) {
  return (
    path === "/" || path.startsWith("/auth") || path.startsWith("/guide")
  );
}

function HeaderPlaceholder() {
  return (
    <header className="sticky top-0 z-40 h-16 border-b border-border/60 bg-background/75" />
  );
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

async function AuthHeader() {
  let user: Awaited<ReturnType<typeof getAuthUser>> = null;
  try {
    user = await getAuthUser();
  } catch (error) {
    logAppError("shell", error, { source: "auth-header" });
  }

  if (!user) return <PublicHeader />;

  return (
    <Suspense
      fallback={
        <Navbar
          authLabel={user.email ?? null}
          isAdmin={isAdminEmail(user.email)}
          showNotifications={false}
          needsClaim={false}
        />
      }
    >
      <VerifiedHeader email={user.email ?? null} />
    </Suspense>
  );
}

async function VerifiedHeader({ email }: { email: string | null }) {
  const auth = await getAuthStatus();
  const managerId = auth.manager?.managerId ?? null;
  return (
    <NotificationProvider managerId={managerId}>
      <Navbar
        authLabel={auth.manager?.displayName ?? email}
        isAdmin={auth.isAdmin}
        showNotifications={managerId != null}
        needsClaim={auth.claim === "unlinked"}
      />
    </NotificationProvider>
  );
}

async function ClaimBanner({ path }: { path: string }) {
  if (path === "/auth/claim") return null;
  const auth = await getAuthStatus();
  if (auth.claim !== "unlinked") return null;
  return (
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
  );
}

async function ChatRail() {
  const auth = await getAuthStatus();
  if (!auth.signedIn) return null;
  return (
    <DressingRoomRail
      managerId={auth.manager?.managerId ?? null}
      managerName={auth.manager?.displayName ?? null}
      isAdmin={auth.isAdmin}
    />
  );
}

/**
 * Page content is a sibling of auth/DB chrome so a slow manager lookup
 * cannot block first HTML.
 */
export async function SiteShell({ children }: { children: ReactNode }) {
  const path = await currentPathname();
  if (isCinematic(path)) return <>{children}</>;

  const compact = isCompactMain(path);

  return (
    <div className="app-canvas flex min-h-screen flex-col">
      <Suspense fallback={<HeaderPlaceholder />}>
        <AuthHeader />
      </Suspense>
      <Suspense fallback={null}>
        <ClaimBanner path={path} />
      </Suspense>
      <Suspense fallback={null}>
        <FeatureErrorBoundary feature="celebration" variant="silent">
          <CelebrationSlot />
        </FeatureErrorBoundary>
      </Suspense>
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1">
          <div
            className={cn(
              "mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8",
              !compact && "py-8 sm:py-10",
            )}
          >
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
        <Suspense fallback={null}>
          <ChatRail />
        </Suspense>
      </div>
      <SiteFooter />
    </div>
  );
}
