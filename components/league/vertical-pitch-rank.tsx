"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Crown, TrendingDown, TrendingUp } from "lucide-react";
import { PitchSurface } from "@/components/league/pitch-surface";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { easeOutSoft, springSoft } from "@/components/motion/variants";
import { initials, rankDelta } from "@/lib/league/format";
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
};

export type PitchRankMode = "live" | "overall";

function shortName(name: string) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.length > 10 ? `${first.slice(0, 9)}…` : first;
}

/** Y% on pitch: 1st near opponent goal, last near own goal. */
function yForRank(rank: number, total: number) {
  if (total <= 1) return 50;
  const t = (rank - 1) / (total - 1);
  return 9 + t * 80;
}

/** Alternate left/right lanes so 12–15 pins stay readable. */
function xForRank(rank: number) {
  return rank % 2 === 0 ? 68 : 32;
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
  total,
  highlightEntryId,
  showGw,
  delay,
}: {
  row: VerticalPitchRow;
  total: number;
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
  const y = yForRank(row.rank, total);
  const x = xForRank(row.rank);

  return (
    <motion.div
      layout={!reduce}
      layoutId={`vpitch-${row.entryId}`}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${x}%`, top: `${y}%` }}
      initial={reduce ? false : { opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        layout: { ...springSoft, duration: 0.55 },
        opacity: { duration: 0.35, delay, ease: easeOutSoft },
        scale: { duration: 0.35, delay, ease: easeOutSoft },
      }}
    >
      <OvertakeFlash entryId={row.entryId} rank={row.rank} reduce={reduce} />
      <Link
        href={`/managers/${row.entryId}`}
        className={cn(
          "group relative flex min-w-[7.25rem] max-w-[9.5rem] items-center gap-1.5 rounded-xl border px-1.5 py-1 shadow-lg backdrop-blur-[3px] outline-none transition-transform sm:min-w-[8.5rem]",
          isLeader
            ? "border-amber-300/60 bg-amber-400/25"
            : isYou
              ? "border-sky-300/70 bg-sky-500/25"
              : "border-white/25 bg-black/35",
          momentum === "rising" && !isYou && !isLeader && "ring-1 ring-emerald-400/40",
          momentum === "falling" && !isYou && !isLeader && "ring-1 ring-red-400/35",
          isYou && "ring-2 ring-sky-300/80 ring-offset-1 ring-offset-transparent",
        )}
        title={`${row.name} · #${row.rank}${row.teamName ? ` · ${row.teamName}` : ""}`}
      >
        <span
          className={cn(
            "relative flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold shadow-md sm:size-9 sm:text-[11px]",
            isLeader
              ? "bg-amber-300 text-emerald-950"
              : isYou
                ? "bg-sky-200 text-sky-950"
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
            <span
              className={cn(
                "truncate text-[10px] font-semibold leading-tight text-white sm:text-[11px]",
              )}
            >
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
        </span>
      </Link>
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
  const { pressure, crowd, rising, falling } = useMemo(() => {
    let moveSum = 0;
    let risingN = 0;
    let fallingN = 0;
    for (const row of rows) {
      if (row.lastRank == null) continue;
      const d = rankDelta(row.rank, row.lastRank);
      moveSum += Math.abs(d);
      if (d > 0) risingN += 1;
      if (d < 0) fallingN += 1;
    }
    const n = Math.max(rows.length, 1);
    const pressure = Math.min(100, Math.round((moveSum / n) * 28));
    const crowd = Math.min(100, Math.round(((risingN + fallingN) / n) * 100));
    return { pressure, crowd, rising: risingN, falling: fallingN };
  }, [rows]);

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
          animate={{ width: `${value}%` }}
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
    () => [...rows].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
    [rows],
  );
  const total = sorted.length;
  const showGw = mode === "live";

  return (
    <div className="space-y-3">
      {showMeters ? <PressureCrowdMeter rows={sorted} /> : null}

      <PitchSurface
        aspectClassName="aspect-[5/8] min-h-[32rem] sm:min-h-[36rem]"
        label={label ?? (mode === "live" ? "Live pitch rank" : "Overall pitch rank")}
      >
        <div className="pointer-events-none absolute top-3 right-3 z-20 text-[9px] font-medium tracking-wide text-white/75 uppercase sm:text-[10px]">
          <span className="rounded-md bg-black/30 px-2 py-0.5 backdrop-blur-sm">
            1st → their box
          </span>
        </div>
        <div className="pointer-events-none absolute bottom-3 right-3 z-20 text-[9px] font-medium tracking-wide text-white/75 uppercase sm:text-[10px]">
          <span className="rounded-md bg-black/30 px-2 py-0.5 backdrop-blur-sm">
            Last → own box
          </span>
        </div>

        {/* Soft center corridor */}
        <div
          aria-hidden
          className="pointer-events-none absolute top-[8%] bottom-[8%] left-1/2 w-px -translate-x-1/2 bg-white/15"
        />

        <LayoutGroup>
          {sorted.map((row, i) => (
            <ManagerLane
              key={row.entryId}
              row={row}
              total={total}
              highlightEntryId={highlightEntryId}
              showGw={showGw}
              delay={0.03 + i * 0.025}
            />
          ))}
        </LayoutGroup>

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
