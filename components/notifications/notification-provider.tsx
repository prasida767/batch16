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
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { formatTimeAgo } from "@/lib/notifications/time-ago";
import type { NotificationView } from "@/lib/notifications/types";
import { FeatureErrorBoundary } from "@/components/error-boundary";
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
  const seenIds = useRef<Set<number>>(new Set());
  const ready = useRef(false);
  const itemsRef = useRef<NotificationView[]>([]);
  itemsRef.current = items;

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
    },
    [enqueueToast],
  );

  const refresh = useCallback(async (mode: "full" | "incremental" = "full") => {
    if (!managerId) {
      setItems([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    try {
      const afterId =
        mode === "incremental"
          ? itemsRef.current.reduce((max, n) => (n.id > max ? n.id : max), 0)
          : 0;
      const url =
        afterId > 0
          ? `/api/notifications?limit=20&after=${afterId}`
          : "/api/notifications?limit=40";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json().catch(() => null)) as
        | {
            kind: "ok";
            items: NotificationView[];
            unreadCount: number;
          }
        | { kind: "error"; message: string }
        | null;
      if (!data || data.kind !== "ok") return;

      const isFirst = !ready.current;
      if (afterId > 0) {
        ingest(data.items, { toastNew: !isFirst });
      } else {
        for (const n of data.items) {
          if (!isFirst && !seenIds.current.has(n.id) && !n.readAt) {
            enqueueToast(n);
          }
          seenIds.current.add(n.id);
        }
        setItems(data.items);
      }
      setUnreadCount(data.unreadCount);
      ready.current = true;
    } catch {
      // Keep the last good list — a failed poll must not blank the bell.
    } finally {
      setLoading(false);
    }
  }, [managerId, ingest, enqueueToast]);

  const pushLocal = useCallback(
    (n: NotificationView) => {
      ingest([n], { toastNew: true });
      setUnreadCount((c) => c + (n.readAt ? 0 : 1));
    },
    [ingest],
  );

  const markRead = useCallback(async (id: number) => {
    let shouldDecrement = false;
    setItems((prev) => {
      const target = prev.find((n) => n.id === id);
      shouldDecrement = Boolean(target && !target.readAt);
      if (!shouldDecrement) return prev;
      return prev.map((n) =>
        n.id === id ? { ...n, readAt: new Date().toISOString() } : n,
      );
    });
    if (shouldDecrement) setUnreadCount((c) => Math.max(0, c - 1));
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", id }),
      });
      if (!res.ok) void refresh("full");
    } catch {
      void refresh("full");
    }
  }, [refresh]);

  const markAllRead = useCallback(async () => {
    setItems((prev) =>
      prev.map((n) =>
        n.readAt ? n : { ...n, readAt: new Date().toISOString() },
      ),
    );
    setUnreadCount(0);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read_all" }),
      });
    } catch {
      void refresh("full");
    }
  }, [refresh]);

  useEffect(() => {
    ready.current = false;
    seenIds.current = new Set();
    void refresh();
  }, [refresh]);

  // Supabase Realtime (postgres_changes) + light poll fallback
  useEffect(() => {
    if (!managerId) return;

    let channel: ReturnType<ReturnType<typeof createClient>["channel"]> | null =
      null;

    if (isSupabaseConfigured()) {
      try {
        const supabase = createClient();
        channel = supabase
          .channel(`notifications-mgr-${managerId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `recipient_manager_id=eq.${managerId}`,
            },
            (payload) => {
              try {
                const row = payload.new as {
                  id?: unknown;
                  recipient_manager_id?: unknown;
                  actor_manager_id?: number | null;
                  type?: string;
                  title?: string;
                  body?: string | null;
                  href?: string | null;
                  meta?: Record<string, unknown> | null;
                  read_at?: string | null;
                  created_at?: string;
                } | null;
                const id = Number(row?.id);
                if (!row || !Number.isInteger(id) || id <= 0) return;
                if (seenIds.current.has(id)) return;
                const view: NotificationView = {
                  id,
                  recipientManagerId: Number(row.recipient_manager_id) || 0,
                  actorManagerId: row.actor_manager_id ?? null,
                  actorName: null,
                  type: row.type ?? "notice",
                  title: row.title ?? "Notification",
                  body: row.body ?? null,
                  href: row.href ?? null,
                  meta: row.meta ?? {},
                  readAt: row.read_at ?? null,
                  createdAt: row.created_at ?? new Date().toISOString(),
                };
                ingest([view], { toastNew: true });
                if (!view.readAt) setUnreadCount((c) => c + 1);
              } catch {
                // A bad realtime payload must not take down the shell.
              }
            },
          )
          .subscribe();
      } catch {
        // Fall through to polling only
      }
    }

    const incrementalTimer = window.setInterval(() => {
      void refresh("incremental");
    }, 10_000);
    const fullTimer = window.setInterval(() => {
      void refresh("full");
    }, 45_000);

    return () => {
      window.clearInterval(incrementalTimer);
      window.clearInterval(fullTimer);
      if (channel && isSupabaseConfigured()) {
        try {
          createClient().removeChannel(channel);
        } catch {
          /* ignore */
        }
      }
    };
  }, [managerId, ingest, refresh]);

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
      <FeatureErrorBoundary name="toasts" fallback={null}>
        <ToastStack toasts={toasts} onDismiss={dismissToast} />
      </FeatureErrorBoundary>
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
