"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { PenaltyDirection } from "@/lib/penalties/types";

export type ShootoutPhase = "idle" | "runup" | "dive" | "result";

const easeRun = [0.4, 0.0, 0.2, 1] as const;
const easeKick = [0.16, 0.84, 0.32, 1] as const;
const easeDive = [0.22, 1.15, 0.36, 1] as const;
const easeNet = [0.34, 1.4, 0.64, 1] as const;

const DIVE: Record<
  PenaltyDirection,
  {
    x: number;
    y: number;
    rotate: number;
    armL: number;
    armR: number;
    legL: number;
    legR: number;
  }
> = {
  left: {
    x: -72,
    y: 28,
    rotate: -58,
    armL: -110,
    armR: 25,
    legL: 48,
    legR: -18,
  },
  center: {
    x: 0,
    y: 26,
    rotate: 0,
    armL: -55,
    armR: 55,
    legL: 12,
    legR: -12,
  },
  right: {
    x: 72,
    y: 28,
    rotate: 58,
    armL: -25,
    armR: 110,
    legL: 18,
    legR: -48,
  },
};

const BALL_GOAL: Record<PenaltyDirection, { x: number; y: number }> = {
  left: { x: -52, y: -132 },
  center: { x: 2, y: -142 },
  right: { x: 52, y: -132 },
};

const BALL_SAVE: Record<PenaltyDirection, { x: number; y: number }> = {
  left: { x: -58, y: -78 },
  center: { x: 0, y: -70 },
  right: { x: 58, y: -78 },
};

/** 3-step run-up positions (px from final plant, relative to spot). */
const RUN_STEPS = [
  { x: 56, y: 36 },
  { x: 34, y: 20 },
  { x: 14, y: 8 },
  { x: 0, y: 0 },
];

function GroundShadow({
  className,
  width = 40,
  blur = 3,
  opacity = 0.35,
}: {
  className?: string;
  width?: number;
  blur?: number;
  opacity?: number;
}) {
  return (
    <motion.div
      aria-hidden
      className={cn("absolute rounded-[100%] bg-black", className)}
      style={{
        width,
        height: Math.max(6, width * 0.18),
        filter: `blur(${blur}px)`,
        opacity,
      }}
    />
  );
}

function SparkBurst({
  active,
  kind,
}: {
  active: boolean;
  kind: "goal" | "save";
}) {
  const particles = useMemo(() => {
    const n = kind === "goal" ? 18 : 10;
    return Array.from({ length: n }, (_, i) => ({
      id: i,
      angle: (i / n) * Math.PI * 2 + i * 0.15,
      dist: 32 + (i % 5) * 16,
      size: 2.5 + (i % 4),
      delay: i * 0.018,
      color:
        kind === "goal"
          ? ["#bbf7d0", "#fde68a", "#facc15", "#ffffff", "#6ee7b7"][i % 5]!
          : ["#7dd3fc", "#bae6fd", "#e0f2fe", "#ffffff"][i % 4]!,
    }));
  }, [kind]);

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute top-[26%] left-1/2 z-[45] size-0">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 8px ${p.color}`,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist,
            y: Math.sin(p.angle) * p.dist - 16,
            opacity: 0,
            scale: 0.15,
          }}
          transition={{ duration: 0.75, delay: p.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

function GoalFrame({
  rippling,
  scored,
  impactSide,
}: {
  rippling: boolean;
  scored: boolean | null;
  impactSide: PenaltyDirection | null;
}) {
  const netId = useId();
  const isGoal = rippling && scored === true;
  const pullX =
    impactSide === "left" ? -6 : impactSide === "right" ? 6 : 0;

  return (
    <div className="absolute top-[4%] left-1/2 z-[15] h-[38%] w-[62%] -translate-x-1/2 sm:w-[56%]">
      {/* Goal mouth depth / shadow */}
      <div className="absolute inset-0 rounded-b-sm bg-gradient-to-b from-black/45 via-black/25 to-black/10" />

      {/* Net */}
      <motion.div
        className="absolute inset-[4%] overflow-hidden"
        style={{ transformOrigin: "50% 0%" }}
        animate={
          isGoal
            ? {
                scaleX: [1, 1.08, 0.96, 1.04, 0.99, 1],
                scaleY: [1, 1.18, 0.9, 1.08, 0.98, 1],
                x: [0, pullX, -pullX * 0.4, pullX * 0.2, 0],
                y: [0, 10, -3, 5, 1, 0],
              }
            : { scaleX: 1, scaleY: 1, x: 0, y: 0 }
        }
        transition={{ duration: 0.85, ease: easeNet }}
      >
        <svg
          className="size-full"
          viewBox="0 0 120 70"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <pattern
              id={`${netId}-grid`}
              width="5"
              height="5"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M5 0 L0 0 0 5"
                fill="none"
                stroke="rgba(230,240,255,0.45)"
                strokeWidth="0.55"
              />
            </pattern>
            <linearGradient id={`${netId}-fade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.2)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
          </defs>
          <rect width="120" height="70" fill={`url(#${netId}-grid)`} />
          <rect width="120" height="70" fill={`url(#${netId}-fade)`} />
          {[20, 40, 60, 80, 100].map((x) => (
            <line
              key={x}
              x1={x}
              y1="0"
              x2={x}
              y2="70"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.4"
            />
          ))}
        </svg>

        {isGoal ? (
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.45),transparent_55%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.9, 0.2, 0] }}
            transition={{ duration: 0.7 }}
          />
        ) : null}
      </motion.div>

      {/* Posts — white with slight bevel */}
      <div className="absolute inset-x-0 top-0 z-10 h-[7px] rounded-full bg-gradient-to-b from-white via-neutral-100 to-neutral-400 shadow-[0_3px_10px_rgba(0,0,0,0.45)]" />
      <div className="absolute top-0 bottom-0 left-0 z-10 w-[7px] rounded-full bg-gradient-to-r from-white via-neutral-100 to-neutral-400 shadow-sm" />
      <div className="absolute top-0 bottom-0 right-0 z-10 w-[7px] rounded-full bg-gradient-to-l from-white via-neutral-100 to-neutral-400 shadow-sm" />

      {/* Corner joints */}
      <div className="absolute top-0 left-0 z-20 size-2.5 -translate-x-[1px] -translate-y-[1px] rounded-full bg-white shadow" />
      <div className="absolute top-0 right-0 z-20 size-2.5 translate-x-[1px] -translate-y-[1px] rounded-full bg-white shadow" />
    </div>
  );
}

function KeeperFigure({
  phase,
  dive,
  scored,
  reduce,
}: {
  phase: ShootoutPhase;
  dive: PenaltyDirection | null;
  scored: boolean | null;
  reduce: boolean | null;
}) {
  const diving = phase === "dive" || phase === "result";
  const dir = dive ?? "center";
  const pose = DIVE[dir];
  const saved = phase === "result" && scored === false;

  return (
    <motion.div
      className="absolute top-[16%] left-1/2 z-20 -translate-x-1/2"
      animate={
        reduce
          ? { x: diving ? pose.x * 0.4 : 0, y: diving ? 10 : 0 }
          : diving
            ? { x: pose.x, y: pose.y, rotate: pose.rotate }
            : phase === "idle"
              ? { x: 0, y: [0, -3, 0], rotate: [0, -1.5, 1.5, 0] }
              : phase === "runup"
                ? { x: 0, y: 0, rotate: 0, scale: [1, 1.03, 1] }
                : { x: 0, y: 0, rotate: 0 }
      }
      transition={
        diving
          ? { duration: 0.55, ease: easeDive }
          : phase === "idle"
            ? {
                y: { repeat: Infinity, duration: 2.4, ease: "easeInOut" },
                rotate: { repeat: Infinity, duration: 3.2, ease: "easeInOut" },
              }
            : { duration: 0.35 }
      }
      style={{ transformOrigin: "50% 85%" }}
    >
      <GroundShadow
        className="bottom-0 left-1/2 -translate-x-1/2"
        width={diving ? 56 : 36}
        opacity={diving ? 0.28 : 0.4}
        blur={4}
      />

      <div className="relative flex w-[3.6rem] flex-col items-center sm:w-16">
        {/* Arms */}
        <motion.div
          className="absolute top-[1.35rem] left-[-0.15rem] z-[5] h-2 w-6 origin-right rounded-full bg-gradient-to-l from-amber-200 to-amber-100 shadow-sm"
          animate={{
            rotate: diving ? pose.armL : phase === "idle" ? [-18, -28, -18] : -22,
            y: diving ? 4 : 0,
          }}
          transition={
            diving
              ? { duration: 0.45, ease: easeDive }
              : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
          }
        >
          <span className="absolute top-[-1px] left-[-3px] size-3 rounded-[4px] bg-white shadow ring-1 ring-black/10" />
        </motion.div>
        <motion.div
          className="absolute top-[1.35rem] right-[-0.15rem] z-[5] h-2 w-6 origin-left rounded-full bg-gradient-to-r from-amber-200 to-amber-100 shadow-sm"
          animate={{
            rotate: diving ? pose.armR : phase === "idle" ? [18, 28, 18] : 22,
            y: diving ? 4 : 0,
          }}
          transition={
            diving
              ? { duration: 0.45, ease: easeDive }
              : { repeat: Infinity, duration: 2.4, ease: "easeInOut" }
          }
        >
          <span className="absolute top-[-1px] right-[-3px] size-3 rounded-[4px] bg-white shadow ring-1 ring-black/10" />
        </motion.div>

        {/* Head + hair */}
        <div className="relative z-10">
          <div className="absolute -top-0.5 left-1/2 h-2 w-4 -translate-x-1/2 rounded-t-full bg-amber-950/80" />
          <div className="size-5 rounded-full bg-gradient-to-b from-[#f3d2b0] to-[#e0a878] shadow-md ring-1 ring-black/10 sm:size-6">
            <span className="absolute inset-x-1.5 top-2 h-[2px] rounded-full bg-amber-950/20" />
          </div>
        </div>

        {/* Jersey */}
        <motion.div
          className="relative z-10 -mt-0.5 flex h-9 w-9 flex-col items-center rounded-lg bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 shadow-lg ring-1 ring-amber-800/25 sm:h-10 sm:w-10"
          animate={saved ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={{ duration: 0.35 }}
        >
          <span className="mt-1.5 text-[9px] font-black text-amber-950/75">
            1
          </span>
          <div className="mt-auto mb-1 h-1 w-5 rounded-full bg-amber-700/30" />
        </motion.div>

        {/* Shorts + legs */}
        <div className="relative z-[8] -mt-0.5 flex h-3 w-8 justify-center rounded-b-md bg-slate-800">
          <div className="absolute top-2 flex gap-1.5">
            <motion.div
              className="h-6 w-2 origin-top rounded-b-full bg-gradient-to-b from-slate-800 to-slate-950 sm:h-7"
              animate={{ rotate: diving ? pose.legL : 0 }}
              transition={{ duration: 0.45, ease: easeDive }}
            >
              <span className="absolute bottom-0 left-1/2 h-1.5 w-2.5 -translate-x-1/2 rounded-sm bg-amber-100" />
            </motion.div>
            <motion.div
              className="h-6 w-2 origin-top rounded-b-full bg-gradient-to-b from-slate-800 to-slate-950 sm:h-7"
              animate={{ rotate: diving ? pose.legR : 0 }}
              transition={{ duration: 0.45, ease: easeDive }}
            >
              <span className="absolute bottom-0 left-1/2 h-1.5 w-2.5 -translate-x-1/2 rounded-sm bg-amber-100" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ShooterFigure({
  phase,
  shot,
  reduce,
}: {
  phase: ShootoutPhase;
  shot: PenaltyDirection | null;
  reduce: boolean | null;
}) {
  const lean =
    shot === "left" ? -14 : shot === "right" ? 14 : shot === "center" ? 2 : 0;

  const runupKeyframes = {
    x: RUN_STEPS.map((s) => s.x),
    y: RUN_STEPS.map((s) => s.y),
  };

  return (
    <motion.div
      className="absolute bottom-[5%] left-1/2 z-30 -translate-x-1/2"
      initial={false}
      animate={
        reduce
          ? {
              x: phase === "idle" ? 40 : 0,
              y: phase === "idle" ? 16 : 0,
            }
          : phase === "idle"
            ? {
                x: RUN_STEPS[0]!.x,
                y: RUN_STEPS[0]!.y,
                rotate: 0,
              }
            : phase === "runup"
              ? {
                  ...runupKeyframes,
                  rotate: [0, -4, 3, lean * 0.35],
                }
              : phase === "dive"
                ? { x: -2, y: -6, rotate: lean }
                : { x: -6, y: 2, rotate: lean * 0.35 }
      }
      transition={
        phase === "runup"
          ? { duration: 0.95, ease: easeRun, times: [0, 0.32, 0.62, 1] }
          : phase === "dive"
            ? { duration: 0.28, ease: "easeOut" }
            : { duration: 0.4 }
      }
    >
      <GroundShadow
        className="bottom-0 left-1/2 -translate-x-1/2"
        width={phase === "runup" ? 44 : 32}
        opacity={0.38}
      />

      <div className="relative flex w-12 flex-col items-center sm:w-14">
        {/* Head */}
        <div className="relative z-10 size-[1.1rem] rounded-full bg-gradient-to-b from-[#f0c9a0] to-[#d49a6a] shadow-md ring-1 ring-black/10 sm:size-5">
          <span className="absolute -top-0.5 left-1/2 h-1.5 w-3 -translate-x-1/2 rounded-t-full bg-emerald-950/70" />
        </div>

        {/* Torso */}
        <div className="relative z-10 -mt-0.5 flex h-8 w-8 items-start justify-center rounded-md bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-800 shadow-lg ring-1 ring-emerald-950/30 sm:h-9 sm:w-9">
          <span className="mt-1.5 text-[8px] font-black text-white/90">9</span>
        </div>

        {/* Arms swing while running */}
        <motion.div
          className="absolute top-5 left-0 z-[5] h-1.5 w-4 origin-right rounded-full bg-[#e8b892]"
          animate={
            phase === "runup"
              ? { rotate: [-35, 40, -35, 20] }
              : phase === "dive"
                ? { rotate: -50 }
                : { rotate: -20 }
          }
          transition={
            phase === "runup"
              ? { duration: 0.95, times: [0, 0.32, 0.62, 1] }
              : { duration: 0.25 }
          }
        />
        <motion.div
          className="absolute top-5 right-0 z-[5] h-1.5 w-4 origin-left rounded-full bg-[#e8b892]"
          animate={
            phase === "runup"
              ? { rotate: [35, -40, 35, -15] }
              : phase === "dive"
                ? { rotate: 30 }
                : { rotate: 20 }
          }
          transition={
            phase === "runup"
              ? { duration: 0.95, times: [0, 0.32, 0.62, 1] }
              : { duration: 0.25 }
          }
        />

        {/* Legs — alternating stride then kick */}
        <div className="mt-0.5 flex gap-1">
          <motion.div
            className="h-5 w-[7px] origin-top rounded-b-full bg-gradient-to-b from-slate-800 to-black sm:h-6"
            animate={
              phase === "runup"
                ? { rotate: [22, -28, 24, -8], y: [0, 1, 0, 0] }
                : phase === "dive"
                  ? { rotate: -20, y: 2 }
                  : { rotate: 8 }
            }
            transition={
              phase === "runup"
                ? { duration: 0.95, times: [0, 0.32, 0.62, 1], ease: easeRun }
                : { duration: 0.22 }
            }
          >
            <span className="absolute bottom-0 left-1/2 h-1 w-2.5 -translate-x-1/2 rounded-sm bg-white" />
          </motion.div>
          <motion.div
            className="h-5 w-[7px] origin-top rounded-b-full bg-gradient-to-b from-slate-800 to-black sm:h-6"
            animate={
              phase === "runup"
                ? { rotate: [-26, 30, -22, 12], y: [1, 0, 1, 0] }
                : phase === "dive"
                  ? { rotate: 62, y: -3, x: 5 }
                  : { rotate: -6 }
            }
            transition={
              phase === "runup"
                ? { duration: 0.95, times: [0, 0.32, 0.62, 1], ease: easeRun }
                : phase === "dive"
                  ? { duration: 0.22, ease: "easeOut" }
                  : { duration: 0.3 }
            }
          >
            <span className="absolute bottom-0 left-1/2 h-1 w-2.5 -translate-x-1/2 rounded-sm bg-white" />
          </motion.div>
        </div>

        {/* Kick impact flash */}
        <AnimatePresence>
          {phase === "dive" ? (
            <motion.span
              className="absolute bottom-4 left-[58%] size-5 -translate-x-1/2 rounded-full bg-white/70 blur-[3px]"
              initial={{ opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0, 1, 0], scale: [0.3, 1.6, 1] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          ) : null}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Ball({
  phase,
  shot,
  dive,
  scored,
  reduce,
}: {
  phase: ShootoutPhase;
  shot: PenaltyDirection | null;
  dive: PenaltyDirection | null;
  scored: boolean | null;
  reduce: boolean | null;
}) {
  const targetDir = shot ?? "center";
  const goal = BALL_GOAL[targetDir];
  const saveSpot = BALL_SAVE[dive ?? targetDir];
  const flying = phase === "dive" || phase === "result";
  const isSave = scored === false;
  const end =
    isSave && (phase === "result" || phase === "dive") ? saveSpot : goal;

  const mid = { x: end.x * 0.48, y: end.y * 0.42 - 36 };
  const late = { x: end.x * 0.82, y: end.y * 0.78 - 8 };

  return (
    <>
      {/* Soft motion smear */}
      {flying && !reduce && phase === "dive" ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-[23%] left-1/2 z-[18] h-2 w-8 -translate-x-1/2 rounded-full bg-white/25 blur-[2px]"
          animate={{
            x: [0, mid.x, late.x],
            y: [0, mid.y, late.y],
            opacity: [0, 0.55, 0],
            rotate: shot === "left" ? -25 : shot === "right" ? 25 : 0,
            scaleX: [0.4, 1.4, 0.6],
          }}
          transition={{ duration: 0.62, ease: easeKick }}
        />
      ) : null}

      <motion.div
        className="absolute bottom-[23%] left-1/2 z-[25] -translate-x-1/2"
        initial={false}
        animate={
          reduce
            ? flying
              ? { x: end.x * 0.5, y: end.y * 0.5, scale: isSave ? 0.75 : 1 }
              : { x: 0, y: 0 }
            : phase === "idle" || phase === "runup"
              ? { x: 0, y: phase === "idle" ? [0, -2, 0] : 0, rotate: 0, scale: 1 }
              : phase === "dive"
                ? {
                    x: [0, mid.x, late.x, end.x],
                    y: [0, mid.y, late.y, end.y],
                    rotate: [0, 160, 340, 520],
                    scale: [1, 0.96, 0.9, 0.88],
                  }
                : {
                    x: end.x + (isSave ? 0 : targetDir === "left" ? -2 : targetDir === "right" ? 2 : 0),
                    y: isSave ? end.y : [end.y, end.y + 6, end.y + 2],
                    rotate: isSave ? 200 : 580,
                    scale: isSave ? 0.72 : [0.88, 1.05, 0.92],
                  }
        }
        transition={
          phase === "idle"
            ? { y: { repeat: Infinity, duration: 1.8, ease: "easeInOut" } }
            : phase === "dive"
              ? { duration: 0.62, ease: easeKick, times: [0, 0.35, 0.7, 1] }
              : phase === "result"
                ? { duration: 0.45, ease: easeNet }
                : { duration: 0.3 }
        }
      >
        <GroundShadow
          className="top-[110%] left-1/2 -translate-x-1/2"
          width={phase === "dive" || phase === "result" ? 14 : 22}
          opacity={phase === "result" && !isSave ? 0.15 : 0.4}
          blur={2}
        />
        <div
          className="relative size-[18px] rounded-full sm:size-[22px]"
          style={{
            background:
              "radial-gradient(circle at 30% 26%, #ffffff 0%, #ececec 34%, #b0b0b0 68%, #5a5a5a 100%)",
            boxShadow:
              "inset -2px -3px 5px rgba(0,0,0,.28), 0 6px 12px rgba(0,0,0,.4)",
          }}
        >
          <div className="absolute inset-[20%] rounded-full border border-neutral-700/35" />
          <div className="absolute top-[48%] left-[12%] h-px w-[76%] rotate-[18deg] bg-neutral-800/35" />
          <div className="absolute top-[30%] left-[40%] h-[40%] w-px rotate-12 bg-neutral-800/25" />
        </div>

        <AnimatePresence>
          {phase === "result" && isSave ? (
            <motion.span
              className="absolute inset-[-8px] rounded-full border-2 border-sky-200"
              initial={{ opacity: 0.95, scale: 0.5 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

function ResultBanner({ scored }: { scored: boolean }) {
  return (
    <motion.div
      className="absolute inset-x-0 top-[40%] z-[55] flex justify-center px-4"
      initial={{ opacity: 0, scale: 0.45, y: 36, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
      exit={{ opacity: 0, scale: 1.08, y: -18, filter: "blur(4px)" }}
      transition={{ type: "spring", stiffness: 280, damping: 16, mass: 0.7 }}
    >
      <motion.span
        className={cn(
          "relative overflow-hidden rounded-full px-6 py-2.5 text-base font-black tracking-[0.18em] uppercase shadow-2xl sm:text-lg",
          scored
            ? "bg-emerald-400 text-emerald-950 ring-2 ring-emerald-100/90"
            : "bg-sky-300 text-sky-950 ring-2 ring-sky-50/90",
        )}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent"
          initial={{ x: "-100%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        {scored ? "Goal!" : "Saved!"}
      </motion.span>
    </motion.div>
  );
}

export function ShootoutPitch({
  dive,
  shot,
  phase,
  scored,
  className,
}: {
  dive: PenaltyDirection | null;
  shot: PenaltyDirection | null;
  phase: ShootoutPhase;
  scored: boolean | null;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const celebrating = phase === "result" && scored === true;
  const saving = phase === "result" && scored === false;

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[5/4] w-full max-w-lg overflow-hidden rounded-2xl shadow-xl ring-1 ring-emerald-950/30 sm:aspect-[16/11]",
        className,
      )}
    >
      {/* Sky + stadium wash */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0c4a6e_0%,#164e3b_28%,#166534_55%,#14532d_100%)]" />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 22px, rgba(255,255,255,0.07) 22px, rgba(255,255,255,0.07) 44px)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)",
        }}
      />
      {/* Depth vignette + floodlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(255,255,255,0.18),transparent_42%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_100%,transparent_40%,rgba(0,0,0,0.45))]" />

      <motion.div
        className="absolute inset-0"
        animate={
          phase === "result"
            ? scored
              ? { x: [0, -4, 5, -3, 2, 0], y: [0, 3, -2, 2, 0] }
              : { x: [0, 3, -3, 1, 0], y: [0, -2, 2, 0] }
            : { x: 0, y: 0 }
        }
        transition={{ duration: 0.45 }}
      >
        {/* Box markings */}
        <div className="absolute inset-x-[10%] top-[5%] h-[50%] rounded-b-[46%] border-2 border-white/25 shadow-[inset_0_0_30px_rgba(0,0,0,0.15)]" />
        <div className="absolute inset-x-[26%] top-[5%] h-[28%] border-2 border-t-0 border-white/22" />
        <div className="absolute top-[5%] left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-white/60" />
        <div className="absolute top-[54%] left-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/18" />

        <GoalFrame
          rippling={phase === "result"}
          scored={scored}
          impactSide={shot}
        />

        {/* Penalty spot */}
        <div className="absolute bottom-[23%] left-1/2 z-[12] size-2.5 -translate-x-1/2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.35)]" />

        <KeeperFigure
          phase={phase}
          dive={dive}
          scored={scored}
          reduce={reduce}
        />
        <Ball
          phase={phase}
          shot={shot}
          dive={dive}
          scored={scored}
          reduce={reduce}
        />
        <ShooterFigure phase={phase} shot={shot} reduce={reduce} />

        <SparkBurst active={celebrating} kind="goal" />
        <SparkBurst active={saving} kind="save" />

        <AnimatePresence>
          {celebrating ? (
            <motion.div
              key="goal-flash"
              className="pointer-events-none absolute inset-0 z-[40] bg-[radial-gradient(circle_at_50%_30%,rgba(167,243,208,0.55),transparent_55%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65 }}
            />
          ) : null}
          {saving ? (
            <motion.div
              key="save-flash"
              className="pointer-events-none absolute inset-0 z-[40] bg-[radial-gradient(circle_at_50%_30%,rgba(125,211,252,0.5),transparent_55%)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.85, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            />
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {phase === "result" && scored != null ? (
            <ResultBanner key={scored ? "g" : "s"} scored={scored} />
          ) : null}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function DirectionButtons({
  disabled,
  onPick,
  label,
}: {
  disabled?: boolean;
  onPick: (dir: PenaltyDirection) => void;
  label?: string;
}) {
  return (
    <div className="space-y-2">
      {label ? (
        <p className="text-center text-xs font-medium text-muted-foreground">
          {label}
        </p>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ["left", "Left"],
            ["center", "Center"],
            ["right", "Right"],
          ] as const
        ).map(([value, text]) => (
          <motion.button
            key={value}
            type="button"
            disabled={disabled}
            whileTap={disabled ? undefined : { scale: 0.94 }}
            whileHover={disabled ? undefined : { y: -2 }}
            onClick={() => onPick(value)}
            className={cn(
              "rounded-xl border border-border/70 bg-card px-3 py-3.5 text-sm font-semibold shadow-xs transition",
              "hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {text}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
