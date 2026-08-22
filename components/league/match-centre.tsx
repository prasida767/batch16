"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Flame, TrendingDown, TrendingUp, Zap } from "lucide-react";
import {
  VerticalPitchRank,
  type PitchRankMode,
  type VerticalPitchRow,
} from "@/components/league/vertical-pitch-rank";
import { LiveBadge, ManagerAvatar } from "@/components/league/shared";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { FadeIn } from "@/components/motion/page-transition";
import { easeOutSoft, springSnappy } from "@/components/motion/variants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { rankDelta } from "@/lib/league/format";
import type {
  LiveManagerScorer,
  LivePlayerScorer,
  LiveStandingUpdate,
  LiveStandingsPayload,
} from "@/lib/league/types";
import { cn } from "@/lib/utils";

const POLL_MS = 60_000;

type RaceRow = LiveStandingUpdate & {
  displayRank: number;
  displayGw: number;
  displayTotal: number;
  momentum: "rising" | "falling" | "steady";
};

function toRaceRows(standings: LiveStandingUpdate[]): RaceRow[] {
  return [...standings]
    .map((row) => {
      const displayGw = row.livePoints ?? row.eventPoints;
      const displayTotal =
        row.livePoints != null
          ? row.totalPoints - row.eventPoints + row.livePoints
          : row.totalPoints;
      return { ...row, displayGw, displayTotal };
    })
    .sort(
      (a, b) =>
        b.displayTotal - a.displayTotal ||
        b.displayGw - a.displayGw ||
        a.playerName.localeCompare(b.playerName),
    )
    .map((row, index) => {
      const displayRank = index + 1;
      const delta = rankDelta(displayRank, row.lastRank || row.rank);
      return {
        ...row,
        displayRank,
        momentum: delta > 0 ? "rising" : delta < 0 ? "falling" : "steady",
      };
    });
}

function toLivePitchRows(rows: RaceRow[]): VerticalPitchRow[] {
  return rows.map((row) => ({
    entryId: row.entryId,
    name: row.playerName,
    teamName: row.teamName,
    rank: row.displayRank,
    lastRank: row.lastRank || row.rank,
    points: row.displayTotal,
    gwPoints: row.displayGw,
  }));
}

function toOverallPitchRows(
  standings: LiveStandingUpdate[],
): VerticalPitchRow[] {
  return [...standings]
    .sort(
      (a, b) => a.rank - b.rank || a.playerName.localeCompare(b.playerName),
    )
    .map((row) => ({
      entryId: row.entryId,
      name: row.playerName,
      teamName: row.teamName,
      rank: row.rank,
      lastRank: row.lastRank || row.rank,
      points: row.totalPoints,
      gwPoints: row.livePoints ?? row.eventPoints,
    }));
}

function formatAgo(fetchedAt: string | null, now: number): string {
  if (!fetchedAt) return "";
  const seconds = Math.max(0, Math.floor((now - Date.parse(fetchedAt)) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

function LivePulse({
  active,
  refreshing,
}: {
  active: boolean;
  refreshing: boolean;
}) {
  if (!active) return null;
  return (
    <span className="relative inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
      <span className="relative flex size-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60",
            refreshing ? "animate-ping" : "animate-pulse",
          )}
        />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      LIVE
    </span>
  );
}

export function MatchCentre({
  initial,
  leagueName,
  highlightEntryId = null,
}: {
  initial: LiveStandingsPayload;
  leagueName: string;
  highlightEntryId?: number | null;
}) {
  const [payload, setPayload] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<PitchRankMode>(
    initial.isLive || initial.isProvisional ? "live" : "overall",
  );
  const inFlight = useRef(false);
  const reduce = useReducedMotion();

  const active = payload.isLive || payload.isProvisional;
  const liveRows = useMemo(
    () => toRaceRows(payload.standings),
    [payload.standings],
  );
  const pitchRows = useMemo(
    () =>
      mode === "live"
        ? toLivePitchRows(liveRows)
        : toOverallPitchRows(payload.standings),
    [mode, liveRows, payload.standings],
  );
  const risers = liveRows.filter((r) => r.momentum === "rising").slice(0, 4);
  const fallers = liveRows.filter((r) => r.momentum === "falling").slice(0, 4);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }

    inFlight.current = true;
    setRefreshing(true);
    try {
      const response = await fetch("/api/live", { cache: "no-store" });
      const json = (await response.json()) as
        | { kind: "ok"; data: LiveStandingsPayload }
        | { kind: "idle"; data: LiveStandingsPayload }
        | { kind: "error"; message: string }
        | { kind: "no_league"; message: string };

      if (json.kind === "ok" || json.kind === "idle") {
        setError(null);
        setPayload(json.data);
        setNow(Date.now());
      } else {
        setError(json.message || "Couldn't refresh live scores.");
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
    if (!active || !payload.fetchedAt) return;
    const tick = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(tick);
  }, [active, payload.fetchedAt]);

  return (
    <div className="space-y-8">
      <FadeIn>
        <div
          className={cn(
            "relative overflow-hidden rounded-2xl border p-6 shadow-card sm:p-8",
            active
              ? "border-emerald-500/25 bg-gradient-to-br from-emerald-500/12 via-background to-sky-500/10"
              : "border-border/70 bg-gradient-to-br from-muted/40 via-background to-background",
          )}
        >
          {active ? (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-emerald-400/20 blur-3xl"
              animate={
                reduce
                  ? undefined
                  : { opacity: [0.35, 0.55, 0.35], scale: [1, 1.08, 1] }
              }
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : null}

          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{leagueName}</Badge>
                {payload.isLive ? (
                  <LivePulse active refreshing={refreshing} />
                ) : (
                  <LiveBadge
                    live={payload.isLive}
                    provisional={payload.isProvisional}
                    refreshing={refreshing}
                  />
                )}
                {payload.currentEventName ? (
                  <Badge variant="outline">{payload.currentEventName}</Badge>
                ) : null}
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
                Live Match Centre
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
                {payload.isLive
                  ? "Everyone on the vertical pitch — watch avatars climb and drop as live points tick every 60 seconds."
                  : payload.isProvisional
                    ? "Bonus is settling — ranks may still slide on the pitch until data is checked."
                    : "Between gameweeks the pitch shows overall rank. Match day brings live movement and auto-refresh."}
              </p>
            </div>
            <div className="space-y-1 text-right text-xs text-muted-foreground">
              {active ? (
                <>
                  <p className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                    <Zap className="size-3.5" />
                    Auto-refresh every 60s
                  </p>
                  {payload.fetchedAt ? (
                    <p>Updated {formatAgo(payload.fetchedAt, now)}</p>
                  ) : null}
                </>
              ) : (
                <p>Polling pauses between gameweeks</p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {error ? (
        <p className="text-sm text-destructive" role="status">
          {error}
        </p>
      ) : null}

      <FadeIn delay={0.04}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
            Vertical pitch
          </h2>
          <div className="inline-flex rounded-lg bg-muted/70 p-0.5 ring-1 ring-border/60">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(mode === "live" && "bg-card shadow-xs")}
              onClick={() => setMode("live")}
              aria-pressed={mode === "live"}
            >
              Live
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(mode === "overall" && "bg-card shadow-xs")}
              onClick={() => setMode("overall")}
              aria-pressed={mode === "overall"}
            >
              Overall
            </Button>
          </div>
        </div>
        <VerticalPitchRank
          rows={pitchRows}
          mode={mode}
          highlightEntryId={highlightEntryId}
          showMeters
          label={mode === "live" ? "Live pitch race" : "Overall pitch rank"}
          caption={
            mode === "live"
              ? "Projected total places everyone from 1st (far goal) to last (own goal). Green climbs, red drops."
              : "Official overall standings on the same pitch layout."
          }
        />
      </FadeIn>

      <div className="grid gap-4 sm:grid-cols-2">
        <MomentumCard
          title="Rising"
          icon={<TrendingUp className="size-4 text-emerald-500" />}
          empty="No climbers yet"
          rows={risers}
          tone="up"
        />
        <MomentumCard
          title="Falling"
          icon={<TrendingDown className="size-4 text-red-500" />}
          empty="No droppers yet"
          rows={fallers}
          tone="down"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopScorersCard
          title="Top GW scorers"
          description="Managers with the most points this gameweek"
          scorers={payload.topScorers}
        />
        <PlayerScorersCard scorers={payload.playerScorers} />
      </div>
    </div>
  );
}

function MomentumCard({
  title,
  icon,
  empty,
  rows,
  tone,
}: {
  title: string;
  icon: ReactNode;
  empty: string;
  rows: RaceRow[];
  tone: "up" | "down";
}) {
  const reduce = useReducedMotion();

  return (
    <Card
      className={cn(tone === "up" ? "ring-emerald-500/15" : "ring-red-500/15")}
    >
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          rows.map((row, i) => {
            const delta = Math.abs(
              rankDelta(row.displayRank, row.lastRank || row.rank),
            );
            return (
              <motion.div
                key={row.entryId}
                initial={
                  reduce ? false : { opacity: 0, x: tone === "up" ? -8 : 8 }
                }
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: i * 0.05,
                  duration: 0.35,
                  ease: easeOutSoft,
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl border px-3 py-2",
                  tone === "up"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-red-500/20 bg-red-500/5",
                )}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <ManagerAvatar name={row.playerName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {row.playerName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      #{row.displayRank} · GW{" "}
                      <AnimatedNumber value={row.displayGw} duration={0.4} />
                    </p>
                  </div>
                </div>
                <motion.span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    tone === "up"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-500",
                  )}
                  initial={reduce ? false : { scale: 0.85 }}
                  animate={{ scale: 1 }}
                  transition={springSnappy}
                >
                  {tone === "up" ? "+" : "−"}
                  {delta}
                </motion.span>
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function TopScorersCard({
  title,
  description,
  scorers,
}: {
  title: string;
  description: string;
  scorers: LiveManagerScorer[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="size-4 text-orange-500" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No GW scores yet.</p>
        ) : (
          scorers.map((row, index) => (
            <Link
              key={row.entryId}
              href={`/managers/${row.entryId}`}
              className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2 transition-colors hover:bg-muted/50"
            >
              <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <ManagerAvatar name={row.playerName} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {row.playerName}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {row.teamName}
                </span>
              </span>
              <span className="text-base font-semibold tabular-nums text-primary">
                <AnimatedNumber
                  value={row.points}
                  duration={0.5}
                  highlightOnChange
                />
              </span>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function PlayerScorersCard({ scorers }: { scorers: LivePlayerScorer[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="size-4 text-sky-500" />
          Hot players
        </CardTitle>
        <CardDescription>
          Highest live scores among league starting XIs
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {scorers.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Player scores appear once a gameweek is live or provisional.
          </p>
        ) : (
          scorers.map((row, index) => (
            <div
              key={row.elementId}
              className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2"
            >
              <span className="w-5 text-sm font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {row.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  Owned by {row.ownedBy}{" "}
                  {row.ownedBy === 1 ? "manager" : "managers"}
                </span>
              </span>
              <span className="text-base font-semibold tabular-nums text-primary">
                <AnimatedNumber
                  value={row.points}
                  duration={0.5}
                  highlightOnChange
                />
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
