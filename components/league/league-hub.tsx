"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { LayoutGrid, Map as MapIcon, CalendarDays } from "lucide-react";
import { StandingsTable } from "@/components/league/standings-table";
import { RankOnPitch } from "@/components/league/rank-on-pitch";
import { UpcomingFixtures } from "@/components/league/upcoming-fixtures";
import { LiveBadge } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/prizes";
import { mergeLiveStandings } from "@/lib/league/standings";
import type { DashboardData, LiveStandingsPayload } from "@/lib/league/types";
import type { UpcomingGameweekFixtures } from "@/lib/fpl";
import type { DocumentaryEpisodeView } from "@/lib/documentary";
import { FeaturedEpisodeCard } from "@/components/documentary/featured-episode-card";
import { FeatureErrorBoundary } from "@/components/error-boundary";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

type ViewMode = "table" | "pitch" | "fixtures";

function formatAgo(fetchedAt: string | null, now: number): string {
  if (!fetchedAt) return "";
  const seconds = Math.max(0, Math.floor((now - Date.parse(fetchedAt)) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

/** Unified league hub: pot snapshot + table or rank-on-pitch view. */
export function LeagueHub({
  initial,
  currency,
  lastWinnerHint,
  initialFixtures = null,
  featuredEpisode = null,
  highlightEntryId = null,
}: {
  initial: DashboardData;
  currency: string;
  lastWinnerHint: string;
  initialFixtures?: UpcomingGameweekFixtures[] | null;
  featuredEpisode?: DocumentaryEpisodeView | null;
  highlightEntryId?: number | null;
}) {
  const [standings, setStandings] = useState(initial.standings ?? []);
  const [isLive, setIsLive] = useState(initial.meta.isLive);
  const [isProvisional, setIsProvisional] = useState(initial.meta.isProvisional);
  const [eventName, setEventName] = useState(initial.meta.currentEventName);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>("table");
  const inFlight = useRef(false);

  const active = isLive || isProvisional;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }

    inFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/live", { cache: "no-store" });
      const json = (await response.json().catch(() => null)) as
        | { kind: "ok"; data: LiveStandingsPayload }
        | { kind: "idle"; data: LiveStandingsPayload }
        | { kind: "error"; message: string }
        | { kind: "no_league"; message: string }
        | null;

      if (json && (json.kind === "ok" || json.kind === "idle")) {
        const payload = json.data;
        setError(null);
        setIsLive(Boolean(payload?.isLive));
        setIsProvisional(Boolean(payload?.isProvisional));
        setEventName(payload?.currentEventName ?? null);
        setFetchedAt(payload?.fetchedAt ?? null);
        setStandings((prev) =>
          mergeLiveStandings(prev, payload?.standings ?? []),
        );
        setNow(Date.now());
      } else {
        setError(json?.message || "Couldn't refresh live scores.");
      }
    } catch {
      setError("Couldn't refresh live scores.");
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      void refresh();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, refresh]);

  useEffect(() => {
    if (!active || !fetchedAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(tick);
  }, [active, fetchedAt]);

  const owedCount = standings.filter(
    (row) => row.verified && row.balance > 0.005,
  ).length;
  const owesCount = standings.filter(
    (row) => row.verified && row.balance < -0.005,
  ).length;
  const verifiedCount = standings.filter((row) => row.verified).length;

  return (
    <div className="space-y-6">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{initial.meta.leagueName}</Badge>
              <LiveBadge
                live={isLive}
                provisional={isProvisional}
                refreshing={refreshing}
              />
              {eventName ? <Badge variant="outline">{eventName}</Badge> : null}
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">
              League
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Standings, pitch ranks, and fixtures — switch views above the
              board.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {active && fetchedAt ? (
              <p className="text-xs text-muted-foreground">
                Updated {formatAgo(fetchedAt, now)} · every 60s
              </p>
            ) : null}
            <div
              className="inline-flex rounded-lg bg-muted/70 p-0.5 ring-1 ring-border/60"
              role="tablist"
              aria-label="League views"
            >
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "gap-1.5",
                  view === "table" && "bg-card shadow-xs",
                )}
                onClick={() => setView("table")}
                role="tab"
                aria-selected={view === "table"}
              >
                <LayoutGrid className="size-3.5" />
                Table
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "gap-1.5",
                  view === "pitch" && "bg-card shadow-xs",
                )}
                onClick={() => setView("pitch")}
                role="tab"
                aria-selected={view === "pitch"}
              >
                <MapIcon className="size-3.5" />
                Pitch
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  "gap-1.5",
                  view === "fixtures" && "bg-card shadow-xs",
                )}
                onClick={() => setView("fixtures")}
                role="tab"
                aria-selected={view === "fixtures"}
              >
                <CalendarDays className="size-3.5" />
                Fixtures
              </Button>
            </div>
          </div>
        </div>
      </FadeIn>

      {error ? (
        <p className="text-sm text-destructive" role="status">
          {error}
        </p>
      ) : null}

      {featuredEpisode ? (
        <FadeIn delay={0.02}>
          <FeatureErrorBoundary name="Documentary" compact>
            <FeaturedEpisodeCard episode={featuredEpisode} />
          </FeatureErrorBoundary>
        </FadeIn>
      ) : null}

      <FadeIn delay={0.04}>
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm">
          <PotStat
            label="Pot"
            value={<AnimatedMoney amount={initial.pot} currency={currency} />}
          />
          <PotStat
            label="Weekly paid"
            value={
              <AnimatedMoney amount={initial.weeklyPaid} currency={currency} />
            }
          />
          <PotStat
            label="Remaining"
            value={
              <AnimatedMoney amount={initial.remaining} currency={currency} />
            }
          />
          <span className="hidden h-4 w-px bg-border sm:block" aria-hidden />
          <p className="text-xs text-muted-foreground sm:max-w-xs">
            {lastWinnerHint}
            {owedCount + owesCount > 0
              ? ` · ${owedCount} owed · ${owesCount} owing`
              : ""}
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.08} key={view}>
        {view === "table" ? (
          <StandingsTable
            rows={standings}
            currency={currency}
            live={isLive}
            provisional={isProvisional}
            refreshing={refreshing}
          />
        ) : view === "pitch" ? (
          <RankOnPitch
            rows={standings}
            live={isLive}
            provisional={isProvisional}
            highlightEntryId={highlightEntryId}
          />
        ) : (
          <UpcomingFixtures initialGameweeks={initialFixtures} />
        )}
      </FadeIn>

      <p className="text-xs text-muted-foreground">
        Pot = {formatMoney(initial.prize.entryFeeNum, currency)} ×{" "}
        {verifiedCount} verified manager{verifiedCount === 1 ? "" : "s"}.
        Unverified seats wait to join before their fee is allocated. After they
        claim, unpaid entry shows −
        {formatMoney(initial.prize.entryFeeNum, currency)}; mark paid in Admin →
        Managers to flip it to +
        {formatMoney(initial.prize.entryFeeNum, currency)}. Wins add on top.
      </p>
    </div>
  );
}

function PotStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
