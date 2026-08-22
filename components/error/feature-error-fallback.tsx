"use client";

import { Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type FeatureErrorVariant = "page" | "rail" | "inline" | "silent";

const COPY: Record<string, { title: string; body: string }> = {
  chat: {
    title: "Dressing Room is taking a break",
    body: "The rest of the league still works. Try opening chat again in a moment.",
  },
  live: {
    title: "Live scores paused",
    body: "Standings may be delayed. Everything else on the site is still available.",
  },
  baaji: {
    title: "Baaji couldn’t load",
    body: "Side bets are unavailable right now. League, Live, and chat are still up.",
  },
  notifications: {
    title: "Notifications unavailable",
    body: "You can keep using the rest of the app.",
  },
  documentary: {
    title: "Documentary paused",
    body: "Episodes couldn’t load. Head back to the league in the meantime.",
  },
  celebration: {
    title: "Celebration skipped",
    body: "",
  },
};

function copyFor(feature: string) {
  return (
    COPY[feature.toLowerCase()] ?? {
      title: `${feature} hit a snag`,
      body: "This section failed, but the rest of Batch 16 is still running.",
    }
  );
}

export function FeatureErrorFallback({
  feature,
  variant = "inline",
  onRetry,
}: {
  feature: string;
  variant?: FeatureErrorVariant;
  onRetry: () => void;
}) {
  const copy = copyFor(feature);

  if (variant === "silent") return null;

  if (variant === "rail") {
    return (
      <aside className="hidden w-12 shrink-0 flex-col items-center gap-3 border-l border-border/60 bg-muted/20 py-4 lg:flex">
        <Shirt className="size-4 text-muted-foreground" />
        <p
          className="origin-center rotate-180 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase"
          style={{ writingMode: "vertical-rl" }}
        >
          Chat offline
        </p>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={onRetry}
          aria-label="Retry Dressing Room"
        >
          ↻
        </Button>
      </aside>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/80 px-4 py-6 text-center shadow-xs",
        variant === "page" && "min-h-[40vh] px-6 py-16",
      )}
      role="alert"
    >
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {feature}
      </p>
      <h2
        className={cn(
          "mt-2 font-semibold tracking-tight",
          variant === "page" ? "text-2xl" : "text-base",
        )}
      >
        {copy.title}
      </h2>
      {copy.body ? (
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {copy.body}
        </p>
      ) : null}
      <Button type="button" size="sm" className="mt-4" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
