"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Maximize2, MessageSquareText, Shirt, X } from "lucide-react";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import {
  DressingRoomProvider,
  useDressingRoomContext,
} from "@/components/chat/dressing-room-context";
import { DressingRoomPanel } from "@/components/chat/dressing-room-panel";
import { readChatOpen, writeChatOpen } from "@/components/chat/use-dressing-room";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { easeOutSoft } from "@/components/motion/variants";
import type { ChatPresencePayload } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const HIDE_ON = ["/auth", "/dressing-room", "/onboarding"];
const FS_KEY = "batch16_dressing_room_fs";

function shouldHide(pathname: string) {
  return HIDE_ON.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function DressingRoomChrome({
  managerId,
  managerName,
  avatarUrl,
  isAdmin,
}: {
  managerId: number | null;
  managerName: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
}) {
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const { unread, setPanelOpen } = useDressingRoomContext();
  const [open, setOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOpen(readChatOpen());
    setFullscreen(window.sessionStorage.getItem(FS_KEY) === "1");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (pathname === "/dressing-room" || pathname.startsWith("/dressing-room/")) {
      setPanelOpen(true);
      return;
    }
    writeChatOpen(open);
    setPanelOpen(open || mobileOpen || fullscreen);
  }, [pathname, open, mobileOpen, fullscreen, setPanelOpen]);

  useEffect(() => {
    if (!hydrated) return;
    window.sessionStorage.setItem(FS_KEY, fullscreen ? "1" : "0");
  }, [fullscreen, hydrated]);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  if (shouldHide(pathname)) {
    return null;
  }

  const panelProps = {
    managerId,
    managerName,
    avatarUrl,
    isAdmin,
  };

  return (
    <>
      <aside
        className={cn(
          "relative hidden shrink-0 border-l border-border/60 transition-[width] duration-300 ease-out lg:block",
          open && !fullscreen ? "w-[min(100%,580px)] xl:w-[640px]" : "w-12",
          fullscreen && "w-0 border-0",
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open && !fullscreen ? (
            <motion.div
              key="open"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.28, ease: easeOutSoft }}
              className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col"
            >
              <div className="absolute top-3 left-0 z-30 flex -translate-x-1/2 flex-col gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-full bg-background shadow-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Collapse Dressing Room"
                  title="Collapse to side"
                >
                  <ChevronRight className="size-4" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="size-8 rounded-full border-emerald-500/40 bg-emerald-600 text-white shadow-md hover:bg-emerald-500 hover:text-white"
                  onClick={() => {
                    setFullscreen(true);
                    setOpen(true);
                  }}
                  aria-label="Expand Dressing Room to full screen"
                  title="Full screen"
                >
                  <Maximize2 className="size-3.5" />
                </Button>
              </div>
              <DressingRoomPanel
                {...panelProps}
                className="h-full rounded-none"
                onToggleFullscreen={() => {
                  setFullscreen(true);
                  setOpen(true);
                }}
              />
            </motion.div>
          ) : !fullscreen ? (
            <motion.div
              key="closed"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col items-center gap-3 border-l border-border/40 bg-muted/30 py-4"
            >
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="relative size-9"
                onClick={() => setOpen(true)}
                aria-label="Open Dressing Room"
              >
                <Shirt className="size-4 text-primary" />
                {hydrated && unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                ) : null}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-9 text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-800"
                onClick={() => {
                  setFullscreen(true);
                  setOpen(true);
                }}
                aria-label="Open Dressing Room full screen"
                title="Full screen"
              >
                <Maximize2 className="size-3.5" />
              </Button>
              <span
                className="origin-center rotate-180 text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase"
                style={{ writingMode: "vertical-rl" }}
              >
                Dressing Room
              </span>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </aside>

      {/* Full-screen immersive overlay */}
      <AnimatePresence>
        {fullscreen ? (
          <motion.div
            key="fs"
            className="fixed inset-0 z-[60] flex flex-col bg-[#080605]"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="absolute top-3 right-3 z-[70] flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5 bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                onClick={() => {
                  setFullscreen(false);
                  setOpen(true);
                }}
              >
                <X className="size-3.5" />
                Exit full screen
              </Button>
            </div>
            <DressingRoomPanel
              {...panelProps}
              immersive
              className="h-dvh"
              onToggleFullscreen={() => {
                setFullscreen(false);
                setOpen(true);
              }}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="lg:hidden">
        <Button
          type="button"
          size="icon"
          className="fixed right-4 bottom-4 z-40 size-12 rounded-2xl bg-emerald-700 text-white shadow-lg hover:bg-emerald-600 mb-[env(safe-area-inset-bottom)] mr-[env(safe-area-inset-right)]"
          onClick={() => setMobileOpen(true)}
          aria-label="Open Dressing Room"
        >
          <MessageSquareText className="size-5" />
          {hydrated && unread > 0 ? (
            <span className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            className="w-full max-w-full border-0 p-0 sm:max-w-full"
            showCloseButton={false}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>The Dressing Room</SheetTitle>
            </SheetHeader>
            <DressingRoomPanel
              {...panelProps}
              className="h-dvh"
              onClose={() => setMobileOpen(false)}
              onToggleFullscreen={() => {
                setMobileOpen(false);
                setFullscreen(true);
              }}
            />
          </SheetContent>
        </Sheet>

        <Link href="/dressing-room" className="sr-only">
          Full Dressing Room page
        </Link>
      </div>
    </>
  );
}

type DressingRoomIdentity = {
  managerId: number | null;
  managerName: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
};

function presenceFrom(props: DressingRoomIdentity): ChatPresencePayload | null {
  return props.managerId != null && props.managerName
    ? {
        managerId: props.managerId,
        displayName: props.managerName,
        avatarUrl: props.avatarUrl ?? null,
        onlineAt: Date.now(),
      }
    : null;
}

/** Chat rail only — does not wrap page content, so auth/DB cannot block the page. */
export function DressingRoomRail(props: DressingRoomIdentity) {
  const pathname = usePathname();
  if (shouldHide(pathname)) return null;

  return (
    <FeatureErrorBoundary feature="chat" variant="rail">
      <DressingRoomProvider me={presenceFrom(props)}>
        <DressingRoomChrome
          managerId={props.managerId}
          managerName={props.managerName}
          avatarUrl={props.avatarUrl}
          isAdmin={props.isAdmin}
        />
      </DressingRoomProvider>
    </FeatureErrorBoundary>
  );
}

export function DressingRoomLayout({
  children,
  managerId,
  managerName,
  avatarUrl,
  isAdmin,
}: DressingRoomIdentity & {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (shouldHide(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-w-0 flex-1">{children}</div>
      <DressingRoomRail
        managerId={managerId}
        managerName={managerName}
        avatarUrl={avatarUrl}
        isAdmin={isAdmin}
      />
    </div>
  );
}
