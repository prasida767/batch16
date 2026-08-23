"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Crown, TrendingDown, TrendingUp } from "lucide-react";
import { PitchSurface } from "@/components/league/pitch-surface";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { easeOutSoft, springSoft } from "@/components/motion/variants";
import { initials, rankDelta } from "@/lib/league/format";
import { pressureCrowdMeters } from "@/lib/league/live";
import { cn } from "@/lib/utils";

export type VerticalPitchRow = {
  entryId: number;
  name: string;
  teamName?: string;
  rank: number;
  /** Previous rank for momentum / overtakes (optional). */
  lastRank?: number;
  /** Primary points shown on the pin (total or projected total). */
  points: number;
  /** Secondary line — usually GW points. */
  gwPoints?: number | null;
  avatarUrl?: string | null;
  verified?: boolean;
};

export type PitchRankMode = "live" | "overall";

function shortName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

function OvertakeFlash({
  entryId,
  rank,
  reduce,
}: {
  entryId: number;
  rank: number;
  reduce: boolean | null;
}) {
  const prev = useRef(rank);
  const [dir, setDir] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = rank;
    if (before === rank) return;
    setDir(rank < before ? "up" : "down");
    const t = window.setTimeout(() => setDir(null), 1400);
    return () => window.clearTimeout(t);
  }, [rank]);

  if (!dir || reduce) return null;

  return (
    <motion.span
      key={`${entryId}-${rank}-${dir}`}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.6, 1.15, 1, 0.9] }}
      transition={{ duration: 1.2 }}
      className={cn(
        "pointer-events-none absolute -top-2 left-1/2 z-20 -translate-x-1/2 rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide uppercase shadow-md",
        dir === "up"
          ? "bg-emerald-400 text-emerald-950"
          : "bg-red-400 text-red-950",
      )}
    >
      {dir === "up" ? "Overtake!" : "Dropped"}
    </motion.span>
  );
}

function PointsBump({
  entryId,
  value,
}: {
  entryId: number;
  value: number;
}) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const delta = value - prev.current;
    prev.current = value;
    if (delta <= 0) return;
    setFlash(delta);
    const t = window.setTimeout(() => setFlash(null), 1500);
    return () => window.clearTimeout(t);
  }, [value]);

  if (flash == null || reduce) return null;

  return (
    <motion.span
      key={`${entryId}-pts-${value}-${flash}`}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: [0, 1, 0], y: [4, -10, -18] }}
      transition={{ duration: 1.3 }}
      className="pointer-events-none absolute -top-3 right-0 text-[10px] font-bold text-emerald-200"
    >
      +{flash}
    </motion.span>
  );
}

function ManagerLane({
  row,
  highlightEntryId,
  showGw,
  delay,
}: {
  row: VerticalPitchRow;
  highlightEntryId: number | null;
  showGw: boolean;
  delay: number;
}) {
  const reduce = useReducedMotion();
  const isYou = highlightEntryId != null && row.entryId === highlightEntryId;
  const isLeader = row.rank === 1;
  const delta =
    row.lastRank != null ? rankDelta(row.rank, row.lastRank) : 0;
  const momentum =
    delta > 0 ? "rising" : delta < 0 ? "falling" : "steady";
  const muted = row.verified === false;

  return (
    <motion.div
      layout={!reduce}
      layoutId={`vpitch-${row.entryId}`}
      className="relative z-10 flex w-full justify-center px-3 sm:px-6"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        layout: { ...springSoft, duration: 0.55 },
        opacity: { duration: 0.35, delay, ease: easeOutSoft },
        y: { duration: 0.35, delay, ease: easeOutSoft },
      }}
    >
      <div className="relative">
      <OvertakeFlash entryId={row.entryId} rank={row.rank} reduce={reduce} />
      <Link
        href={`/managers/${row.entryId}`}
        className={cn(
          "group relative flex min-w-[11.5rem] max-w-[16rem] items-center gap-2 rounded-xl border px-2 py-1.5 shadow-lg backdrop-blur-[3px] outline-none transition-transform sm:min-w-[13rem]",
          isLeader
            ? "border-amber-300/60 bg-amber-400/25"
            : isYou
              ? "border-sky-300/70 bg-sky-500/25"
              : muted
                ? "border-white/15 bg-black/25"
                : "border-white/25 bg-black/35",
          momentum === "rising" && !isYou && !isLeader && "ring-1 ring-emerald-400/40",
          momentum === "falling" && !isYou && !isLeader && "ring-1 ring-red-400/35",
          isYou && "ring-2 ring-sky-300/80 ring-offset-1 ring-offset-transparent",
          muted && "opacity-70",
        )}
        title={`${row.name} · #${row.rank}${row.teamName ? ` · ${row.teamName}` : ""}${muted ? " · Unverified" : ""}`}
      >
        <span
          className={cn(
            "relative flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-md sm:size-9 sm:text-[11px]",
            isLeader
              ? "bg-amber-300 text-emerald-950"
              : isYou
                ? "bg-sky-200 text-sky-950"
                : muted
                  ? "bg-white/70 text-emerald-950 grayscale"
                  : "bg-white/95 text-emerald-950",
          )}
        >
          {initials(row.name)}
          <span
            className={cn(
              "absolute -top-1 -left-1 flex size-4 items-center justify-center rounded-full text-[8px] font-bold shadow-sm",
              isLeader
                ? "bg-amber-500 text-emerald-950"
                : "bg-emerald-950/85 text-white",
            )}
          >
            {isLeader ? <Crown className="size-2.5" /> : row.rank}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1">
            <span className="truncate text-[10px] font-semibold leading-tight text-white sm:text-[11px]">
              {isYou ? "You" : shortName(row.name)}
            </span>
            {momentum === "rising" ? (
              <TrendingUp className="size-3 shrink-0 text-emerald-300" />
            ) : momentum === "falling" ? (
              <TrendingDown className="size-3 shrink-0 text-red-300" />
            ) : null}
          </span>
          <span className="relative flex items-baseline gap-1 tabular-nums">
            <span className="text-[11px] font-bold text-emerald-50 sm:text-xs">
              <AnimatedNumber value={row.points} duration={0.5} highlightOnChange />
            </span>
            {showGw && row.gwPoints != null ? (
              <span className="text-[9px] text-emerald-100/70">
                GW{" "}
                <AnimatedNumber value={row.gwPoints} duration={0.45} highlightOnChange />
              </span>
            ) : null}
            {showGw && row.gwPoints != null ? (
              <PointsBump entryId={row.entryId} value={row.gwPoints} />
            ) : null}
          </span>
          {row.teamName ? (
            <span className="block truncate text-[9px] text-white/65">
              {row.teamName}
            </span>
          ) : null}
        </span>
      </Link>
      </div>
    </motion.div>
  );
}

/** Pressure / crowd chaos from rank movement across the field. */
export function PressureCrowdMeter({
  rows,
  className,
}: {
  rows: VerticalPitchRow[];
  className?: string;
}) {
  const { pressure, crowd, rising, falling } = useMemo(
    () => pressureCrowdMeters(rows),
    [rows],
  );

  return (
    <div
      className={cn(
        "grid gap-3 rounded-xl border border-border/70 bg-muted/30 p-3 sm:grid-cols-2",
        className,
      )}
    >
      <MeterBar
        label="Pressure Index"
        value={pressure}
        hint={
          pressure >= 60
            ? "Board is shaking"
            : pressure >= 30
              ? "A few big swings"
              : "Calm for now"
        }
        tone="amber"
      />
      <MeterBar
        label="Crowd Meter"
        value={crowd}
        hint={`${rising} rising · ${falling} falling`}
        tone="emerald"
      />
    </div>
  );
}

function MeterBar({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "amber" | "emerald";
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums">{value}</p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <motion.div
          className={cn(
            "h-full rounded-full",
            tone === "amber"
              ? "bg-gradient-to-r from-amber-500 to-orange-500"
              : "bg-gradient-to-r from-emerald-500 to-teal-400",
          )}
          initial={false}
          animate={{
            width: `${Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0))}%`,
          }}
          transition={{ duration: 0.6, ease: easeOutSoft }}
        />
      </div>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

export function VerticalPitchRank({
  rows,
  mode = "overall",
  highlightEntryId = null,
  label,
  caption,
  showMeters = false,
}: {
  rows: VerticalPitchRow[];
  mode?: PitchRankMode;
  highlightEntryId?: number | null;
  label?: string;
  caption?: string;
  showMeters?: boolean;
}) {
  const sorted = useMemo(
    () =>
      [...rows]
        .filter((row) => Number.isFinite(row.entryId) && row.entryId > 0)
        .sort(
          (a, b) =>
            (Number.isFinite(a.rank) ? a.rank : 9999) -
              (Number.isFinite(b.rank) ? b.rank : 9999) ||
            a.name.localeCompare(b.name),
        ),
    [rows],
  );
  const total = sorted.length;
  const showGw = mode === "live";

  return (
    <div className="space-y-3">
      {showMeters ? <PressureCrowdMeter rows={sorted} /> : null}

      <PitchSurface
        aspectClassName="aspect-auto w-full"
        className="min-h-[32rem]"
        style={{ height: `${Math.max(32, 7 + total * 3.55)}rem` }}
        label={label ?? (mode === "live" ? "Live pitch rank" : "Overall pitch rank")}
      >
        <div className="pointer-events-none absolute top-3 right-3 z-20 text-[9px] font-medium tracking-wide text-white/75 uppercase sm:text-[10px]">
          <span className="rounded-md bg-black/30 px-2 py-0.5 backdrop-blur-sm">
            1st → goal
          </span>
        </div>
        <div className="pointer-events-none absolute right-3 bottom-3 z-20 text-[9px] font-medium tracking-wide text-white/75 uppercase sm:text-[10px]">
          <span className="rounded-md bg-black/30 px-2 py-0.5 backdrop-blur-sm">
            Last → own box
          </span>
        </div>

        <div className="relative z-10 flex h-full flex-col justify-between py-[7%]">
          <LayoutGroup>
            {sorted.map((row, i) => (
              <ManagerLane
                key={row.entryId}
                row={row}
                highlightEntryId={highlightEntryId}
                showGw={showGw}
                delay={0.03 + i * 0.025}
              />
            ))}
          </LayoutGroup>
        </div>

        {total === 0 ? (
          <p className="absolute inset-0 z-20 flex items-center justify-center text-sm text-white/80">
            No managers on the pitch yet.
          </p>
        ) : null}
      </PitchSurface>

      <p className="text-xs text-muted-foreground">
        {caption ??
          (mode === "live"
            ? "Everyone on the pitch by live projected total — watch them climb toward the far goal."
            : "Everyone on the pitch by overall rank — leader at the far end, last by their own goal.")}
      </p>
    </div>
  );
}
