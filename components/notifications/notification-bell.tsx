"use client";

import Link from "next/link";
import { Bell, CheckCheck, LoaderCircle } from "lucide-react";
import { useNotifications } from "@/components/notifications/notification-provider";
import { formatTimeAgo } from "@/lib/notifications/time-ago";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, string> = {
  baaji_challenge: "⚔️",
  baaji_accepted: "✅",
  baaji_declined: "🙅",
  baaji_result: "🏆",
  chat_reply: "💬",
  chat_mention: "@",
  taunt: "😈",
  awards_published: "🎖️",
  documentary_episode: "🎬",
};

export function NotificationBell() {
  const { items, unreadCount, loading, markRead, markAllRead } =
    useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : "Notifications"
            }
          />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[9px] font-bold text-emerald-950 ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[min(100vw-2rem,22rem)] p-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          {unreadCount > 0 ? (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
            >
              <CheckCheck className="size-3" />
              Mark all read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-[min(70vh,24rem)] overflow-y-auto">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center gap-2 px-3 py-8 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : (
            <ul className="py-1">
              {items.map((n) => {
                const unread = !n.readAt;
                const icon = TYPE_ICON[n.type] ?? "🔔";
                const content = (
                  <>
                    <span className="mt-0.5 text-base leading-none">{icon}</span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block text-sm leading-snug",
                          unread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {n.title}
                      </span>
                      {n.body ? (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">
                          {n.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[10px] text-muted-foreground/80">
                        {formatTimeAgo(n.createdAt)}
                      </span>
                    </span>
                    {unread ? (
                      <span className="mt-1.5 size-2 shrink-0 rounded-full bg-amber-500" />
                    ) : (
                      <span className="size-2 shrink-0" />
                    )}
                  </>
                );

                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/70",
                          unread && "bg-primary/5",
                        )}
                        onClick={() => {
                          if (unread) void markRead(n.id);
                        }}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className={cn(
                          "flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/70",
                          unread && "bg-primary/5",
                        )}
                        onClick={() => {
                          if (unread) void markRead(n.id);
                        }}
                      >
                        {content}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
