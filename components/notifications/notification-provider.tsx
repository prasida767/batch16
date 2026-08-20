"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { formatTimeAgo } from "@/lib/notifications/time-ago";
import type { NotificationView } from "@/lib/notifications/types";
import { cn } from "@/lib/utils";

type ToastItem = NotificationView & { toastId: string };

type NotificationsContextValue = {
  managerId: number | null;
  items: NotificationView[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  pushLocal: (n: NotificationView) => void;
  setPanelOpen: (open: boolean) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return ctx;
}

export function useNotificationsOptional() {
  return useContext(NotificationsContext);
}

function sortNewest(list: NotificationView[]) {
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function NotificationProvider({
  managerId,
  children,
}: {
  managerId: number | null;
  children: ReactNode;
}) {
  const [items, setItems] = useState<NotificationView[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(Boolean(managerId));
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const seenIds = useRef<Set<number>>(new Set());
  const ready = useRef(false);
  const failStreak = useRef(0);

  const dismissToast = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.toastId !== toastId));
  }, []);

  const enqueueToast = useCallback(
    (n: NotificationView) => {
      const toastId = `toast-${n.id}-${Date.now()}`;
      setToasts((prev) => [{ ...n, toastId }, ...prev].slice(0, 4));
      window.setTimeout(() => dismissToast(toastId), 4500);
    },
    [dismissToast],
  );

  const ingest = useCallback(
    (incoming: NotificationView[], { toastNew }: { toastNew: boolean }) => {
      setItems((prev) => {
        const map = new Map(prev.map((n) => [n.id, n]));
        for (const n of incoming) map.set(n.id, n);
        return sortNewest([...map.values()]).slice(0, 60);
      });

      for (const n of incoming) {
        if (seenIds.current.has(n.id)) continue;
        seenIds.current.add(n.id);
        if (toastNew && ready.current && !n.readAt) {
          enqueueToast(n);
        }
      }

      setUnreadCount((prev) => {
        // Recompute from merged set is safer after state update; approximate here
        // and correct on refresh. We'll set from payload when full list refresh.
        return prev;
      });
    },
    [enqueueToast],
  );

  const refresh = useCallback(async () => {
    if (!managerId) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    // Back off after repeated failures so error states don't hammer the API.
    if (failStreak.current >= 3) return;
    try {
      const res = await fetch("/api/notifications?limit=40", {
        cache: "no-store",
      });
      const data = (await res.json()) as
        | {
            kind: "ok";
            items: NotificationView[];
            unreadCount: number;
          }
        | { kind: "error"; message: string };
      if (!res.ok || data.kind !== "ok") {
        failStreak.current += 1;
        return;
      }

      failStreak.current = 0;
      for (const n of data.items) seenIds.current.add(n.id);
      setItems(data.items);
      setUnreadCount(data.unreadCount);
      ready.current = true;
    } catch {
      failStreak.current += 1;
    } finally {
      setLoading(false);
    }
  }, [managerId]);

  const pushLocal = useCallback(
    (n: NotificationView) => {
      ingest([n], { toastNew: true });
      setUnreadCount((c) => c + (n.readAt ? 0 : 1));
    },
    [ingest],
  );

  const markRead = useCallback(async (id: number) => {
    setItems((prev) =>
      prev.map((n) =>
        n.id === id && !n.readAt
          ? { ...n, readAt: new Date().toISOString() }
          : n,
      ),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read", id }),
    });
  }, []);

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    );
    setUnreadCount(0);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "read_all" }),
    });
  }, []);

  useEffect(() => {
    ready.current = false;
    seenIds.current = new Set();
    failStreak.current = 0;
    void refresh();
  }, [refresh]);

  // Refresh as soon as the bell opens (poll-only — no postgres_changes / WAL).
  useEffect(() => {
    if (!managerId || !panelOpen) return;
    failStreak.current = 0;
    void refresh();
  }, [managerId, panelOpen, refresh]);

  // Poll for badge updates; pause when the tab is hidden. Faster while open.
  useEffect(() => {
    if (!managerId) return;

    const pollTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void refresh();
    }, panelOpen ? 15_000 : 90_000);

    return () => window.clearInterval(pollTimer);
  }, [managerId, panelOpen, refresh]);

  const value = useMemo(
    () => ({
      managerId,
      items,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      pushLocal,
      setPanelOpen,
    }),
    [
      managerId,
      items,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
      pushLocal,
    ],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </NotificationsContext.Provider>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      className="pointer-events-none fixed right-3 bottom-3 z-[80] flex w-[min(100%-1.5rem,22rem)] flex-col gap-2 sm:right-5 sm:bottom-5"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.toastId}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-lg ring-1 ring-foreground/5 backdrop-blur-md"
          >
            <div className="flex items-start gap-2 px-3.5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold tracking-tight">
                  {toast.title}
                </p>
                {toast.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {toast.body}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] text-muted-foreground/80">
                  {formatTimeAgo(toast.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss"
                onClick={() => onDismiss(toast.toastId)}
              >
                <X className="size-3.5" />
              </button>
            </div>
            {toast.href ? (
              <a
                href={toast.href}
                className={cn(
                  "block border-t border-border/60 bg-muted/40 px-3.5 py-2 text-center text-[11px] font-semibold text-primary hover:bg-muted/70",
                )}
                onClick={() => onDismiss(toast.toastId)}
              >
                Open
              </a>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
