"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Crown,
  MessageSquareText,
  Sparkles,
  Trophy,
  Users,
  X,
} from "lucide-react";
import { ManagerAvatar } from "@/components/league/shared";
import { ConfettiBurst, ConfettiRain } from "@/components/motion/confetti";
import { Button, buttonVariants } from "@/components/ui/button";
import { easeOutSoft } from "@/components/motion/variants";
import type { GwWinnerCelebration } from "@/lib/league/celebration";
import { cn } from "@/lib/utils";

const PUNCHLINES = [
  "They cooked. Everyone else got leftovers.",
  "Crown collected. Ego inflated. Deserved.",
  "One week. One throne. Zero mercy.",
  "The differentials hit. The template cried.",
  "Points. Power. Pure chaos.",
  "Write it in the Dressing Room — history just happened.",
];

function punchline(gameweek: number) {
  return PUNCHLINES[gameweek % PUNCHLINES.length]!;
}

function dismissKey(celebrationKey: string) {
  return `gw-overlay-dismiss:${celebrationKey}`;
}

function SparkleField({ count = 10 }: { count?: number }) {
  const reduce = useReducedMotion();
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${8 + ((i * 23) % 84)}%`,
        delay: (i % 6) * 0.35,
        size: 2 + (i % 3),
        dur: 2.2 + (i % 4) * 0.4,
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {sparks.map((s) => (
        <motion.span
          key={s.id}
          className="absolute top-1 rounded-full bg-amber-200"
          style={{ left: s.left, width: s.size, height: s.size }}
          animate={{
            y: [0, 18, 36],
            opacity: [0, 0.9, 0],
            scale: [0.6, 1.2, 0.4],
          }}
          transition={{
            duration: s.dur,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

const CONFETTI_COLORS = [
  "#34d399",
  "#fbbf24",
  "#f472b6",
  "#38bdf8",
  "#a3e635",
  "#ffffff",
  "#fb923c",
];

/** Continuous light confetti inside the banner strip. */
function BannerConfetti({ count = 28 }: { count?: number }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: `${(i * 11 + 3) % 97}%`,
        delay: (i % 9) * 0.28,
        duration: 2.4 + (i % 5) * 0.35,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        w: 4 + (i % 4),
        h: 3 + (i % 3),
        rot: (i % 2 === 0 ? 1 : -1) * (40 + i * 12),
        drift: (i % 2 === 0 ? 1 : -1) * (8 + (i % 5) * 4),
      })),
    [count],
  );
  if (reduce) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.id}
          className="absolute -top-2 rounded-[1px]"
          style={{
            left: b.left,
            width: b.w,
            height: b.h,
            backgroundColor: b.color,
          }}
          animate={{
            y: ["-10%", "140%"],
            x: [0, b.drift, b.drift * -0.5],
            rotate: [0, b.rot],
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: b.duration,
            delay: b.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}

function FloatingTrophy({
  className,
  delay = 0,
  size = "md",
}: {
  className?: string;
  delay?: number;
  size?: "sm" | "md" | "lg";
}) {
  const reduce = useReducedMotion();
  const dim = size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";
  return (
    <motion.span
      className={cn(
        "pointer-events-none absolute inline-flex items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 shadow-md shadow-amber-500/30",
        dim,
        className,
      )}
      animate={
        reduce
          ? undefined
          : {
              y: [0, -6, 0],
              rotate: [-8, 8, -8],
              scale: [1, 1.08, 1],
            }
      }
      transition={{
        duration: 2.4 + delay * 0.2,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      aria-hidden
    >
      <Trophy className={size === "lg" ? "size-3.5" : "size-2.5"} />
    </motion.span>
  );
}

/** Tiny cartoon celebrator — bouncing stick figure with trophy. */
function CartoonFan({
  side,
  delay = 0,
}: {
  side: "left" | "right";
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn(
        "pointer-events-none absolute bottom-0 z-[1] hidden sm:block",
        side === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2",
      )}
      animate={
        reduce
          ? undefined
          : { y: [0, -4, 0], rotate: side === "left" ? [-4, 4, -4] : [4, -4, 4] }
      }
      transition={{ duration: 0.9, delay, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden
    >
      <svg width="36" height="44" viewBox="0 0 36 44" fill="none">
        {/* Trophy above head */}
        <motion.g
          animate={reduce ? undefined : { y: [0, -3, 0], rotate: [-10, 10, -10] }}
          transition={{ duration: 0.7, delay: delay + 0.1, repeat: Infinity }}
        >
          <rect x="14" y="0" width="8" height="5" rx="1" fill="#fbbf24" />
          <path d="M12 5h12v2H12z" fill="#f59e0b" />
          <rect x="16" y="7" width="4" height="3" fill="#d97706" />
        </motion.g>
        {/* Head */}
        <circle cx="18" cy="16" r="5" fill="#f2c9a0" />
        <circle cx="16.2" cy="15.5" r="0.8" fill="#1a1a1a" />
        <circle cx="19.8" cy="15.5" r="0.8" fill="#1a1a1a" />
        <path
          d="M16 18 Q18 19.5 20 18"
          stroke="#5c4030"
          strokeWidth="0.8"
          fill="none"
        />
        {/* Body jersey */}
        <ellipse cx="18" cy="27" rx="7" ry="6" fill="#10b981" />
        <rect x="14" y="23" width="8" height="3" fill="#fbbf24" opacity="0.9" />
        {/* Arms waving */}
        <motion.g
          animate={reduce ? undefined : { rotate: [0, -22, 10, 0] }}
          transition={{ duration: 0.55, delay, repeat: Infinity }}
          style={{ originX: "11px", originY: "26px" }}
        >
          <path
            d="M11 26 Q6 20 8 15"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>
        <motion.g
          animate={reduce ? undefined : { rotate: [0, 22, -10, 0] }}
          transition={{ duration: 0.55, delay: delay + 0.08, repeat: Infinity }}
          style={{ originX: "25px", originY: "26px" }}
        >
          <path
            d="M25 26 Q30 20 28 15"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            fill="none"
          />
        </motion.g>
        {/* Legs */}
        <path d="M15 32 L13 42" stroke="#1e3a2f" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M21 32 L23 42" stroke="#1e3a2f" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}

function BannerPopper({ side }: { side: "left" | "right" }) {
  const reduce = useReducedMotion();
  const bits = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => ({
        id: i,
        dx: (side === "left" ? 1 : -1) * (14 + (i % 4) * 10),
        dy: -28 - (i % 3) * 14,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
        size: 3 + (i % 3),
      })),
    [side],
  );
  if (reduce) return null;
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-1 z-[2]",
        side === "left" ? "left-10 sm:left-14" : "right-10 sm:right-14",
      )}
      aria-hidden
    >
      <motion.div
        className={cn(
          "h-5 w-2 rounded-t-full bg-gradient-to-b from-amber-300 to-amber-600",
          side === "left" ? "rotate-[-32deg]" : "rotate-[32deg]",
        )}
        animate={{ scaleY: [1, 0.88, 1] }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.8 }}
      />
      {bits.map((b, i) => (
        <motion.span
          key={b.id}
          className="absolute bottom-4 rounded-sm"
          style={{
            width: b.size,
            height: b.size * 0.7,
            backgroundColor: b.color,
            left: side === "left" ? 2 : undefined,
            right: side === "right" ? 2 : undefined,
          }}
          animate={{
            x: [0, b.dx * 0.5, b.dx],
            y: [0, b.dy, b.dy * 0.2],
            opacity: [0, 1, 0],
            rotate: [0, (i % 2 === 0 ? 1 : -1) * 90],
          }}
          transition={{
            duration: 1.1,
            delay: 0.05 * i,
            repeat: Infinity,
            repeatDelay: 2.8,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

function BuntingFlags() {
  const reduce = useReducedMotion();
  const flags = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        id: i,
        color: [
          "bg-emerald-400",
          "bg-amber-300",
          "bg-sky-300",
          "bg-rose-300",
          "bg-lime-300",
          "bg-orange-300",
        ][i % 6]!,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex h-3 justify-between px-0.5 sm:h-3.5">
      <div className="absolute inset-x-3 top-0 h-px bg-amber-200/60" />
      {flags.map((f, i) => (
        <motion.span
          key={f.id}
          className={cn("h-3 w-2.5 origin-top sm:h-3.5 sm:w-3", f.color)}
          style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)" }}
          animate={
            reduce
              ? undefined
              : {
                  rotate: [
                    i % 2 === 0 ? -10 : 10,
                    i % 2 === 0 ? 10 : -10,
                    i % 2 === 0 ? -10 : 10,
                  ],
                }
          }
          transition={{
            duration: 1.8 + (i % 4) * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/** Persistent strip under the navbar — stays until next GW. */
function WinnerNavbarBanner({
  celebration,
  onReplay,
}: {
  celebration: GwWinnerCelebration;
  onReplay: () => void;
}) {
  const reduce = useReducedMotion();
  const primary = celebration.winners[0]!;
  const isTie = celebration.winners.length > 1;
  const names = celebration.winners.map((w) => w.name).join(" & ");
  const shortNames = celebration.winners
    .map((w) => w.name.split(" ")[0])
    .join(" & ");

  return (
    <motion.div
      initial={reduce ? false : { height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.45, ease: easeOutSoft }}
      className="relative z-30 overflow-hidden border-b border-amber-400/25"
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 pt-3 text-emerald-50 sm:pt-3.5">
        <BuntingFlags />
        <BannerConfetti count={32} />
        <SparkleField count={16} />
        <CartoonFan side="left" delay={0} />
        <CartoonFan side="right" delay={0.15} />
        <BannerPopper side="left" />
        <BannerPopper side="right" />

        {/* Floating trophies across the strip */}
        <FloatingTrophy className="top-4 left-[18%]" delay={0} size="sm" />
        <FloatingTrophy className="top-3 left-[32%]" delay={0.3} size="md" />
        <FloatingTrophy className="top-5 right-[30%]" delay={0.5} size="sm" />
        <FloatingTrophy className="top-3 right-[18%]" delay={0.2} size="md" />
        <FloatingTrophy
          className="top-4 right-[42%] hidden md:inline-flex"
          delay={0.7}
          size="lg"
        />
        <FloatingTrophy
          className="top-5 left-[48%] hidden lg:inline-flex"
          delay={0.4}
          size="sm"
        />

        {/* Animated gradient wash */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,transparent_20%,rgba(251,191,36,0.16)_45%,transparent_70%)]"
          animate={reduce ? undefined : { x: ["-40%", "40%", "-40%"] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        />

        {/* Shimmer sweep */}
        {!reduce ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent"
            animate={{ left: ["-30%", "120%"] }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              repeatDelay: 1.8,
              ease: "easeInOut",
            }}
          />
        ) : null}

        {/* Orbiting stars around content */}
        {!reduce ? (
          <>
            <motion.span
              className="pointer-events-none absolute top-1/2 left-[22%] text-amber-300"
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{
                rotate: { duration: 8, repeat: Infinity, ease: "linear" },
                scale: { duration: 1.5, repeat: Infinity },
              }}
              aria-hidden
            >
              <Sparkles className="size-3.5" />
            </motion.span>
            <motion.span
              className="pointer-events-none absolute top-1/2 right-[24%] text-amber-200"
              animate={{ rotate: -360, y: [0, -4, 0] }}
              transition={{
                rotate: { duration: 10, repeat: Infinity, ease: "linear" },
                y: { duration: 1.2, repeat: Infinity },
              }}
              aria-hidden
            >
              <Crown className="size-3.5" />
            </motion.span>
          </>
        ) : null}

        <div className="relative mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:gap-4 sm:px-6 sm:py-3.5 lg:px-8">
          <motion.div
            className="relative z-[2] shrink-0"
            animate={
              reduce
                ? undefined
                : { scale: [1, 1.08, 1], rotate: [0, -4, 4, 0] }
            }
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* Pulse rings */}
            {!reduce ? (
              <>
                <motion.span
                  className="absolute inset-0 rounded-full border border-amber-300/40"
                  animate={{ scale: [1, 1.55], opacity: [0.5, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                <motion.span
                  className="absolute inset-0 rounded-full border border-emerald-300/30"
                  animate={{ scale: [1, 1.8], opacity: [0.4, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, delay: 0.4 }}
                />
              </>
            ) : null}
            <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2">
              <motion.span
                className="inline-flex size-6 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 shadow-md shadow-amber-500/50"
                animate={
                  reduce
                    ? undefined
                    : { y: [0, -3, 0], rotate: [-12, 12, -12] }
                }
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                {isTie ? (
                  <Trophy className="size-3" />
                ) : (
                  <Crown className="size-3" />
                )}
              </motion.span>
            </span>
            <span className="block rounded-full ring-2 ring-amber-300/60 ring-offset-2 ring-offset-emerald-950 shadow-[0_0_24px_rgba(251,191,36,0.45)]">
              <ManagerAvatar
                name={primary.name}
                src={primary.avatarUrl}
                size="md"
                supportedTeamId={primary.supportedTeamId}
                supportedTeamCode={primary.supportedTeamCode}
                avatarVariant={primary.avatarVariant}
                animated={!reduce}
              />
            </span>
          </motion.div>

          <div className="relative z-[2] min-w-0 flex-1 overflow-hidden">
            <div className="sm:hidden">
              <motion.p
                className="whitespace-nowrap font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide"
                animate={reduce ? undefined : { x: ["8%", "-60%"] }}
                transition={
                  reduce
                    ? undefined
                    : {
                        duration: Math.max(11, names.length * 0.42),
                        repeat: Infinity,
                        ease: "linear",
                      }
                }
              >
                🏆 GW{celebration.gameweek} Winner · {names} ·{" "}
                {celebration.winnerPoints} pts 🎉 🏆 GW{celebration.gameweek}{" "}
                Winner · {names}
              </motion.p>
            </div>

            <div className="hidden sm:block">
              <motion.p
                className="flex flex-wrap items-baseline gap-x-2 font-[family-name:var(--font-display)] text-base font-semibold tracking-tight md:text-lg"
                initial={reduce ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: easeOutSoft }}
              >
                <motion.span
                  className="inline-flex items-center gap-1 text-amber-300"
                  animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                >
                  <Sparkles className="size-3.5" />
                  GW{celebration.gameweek} {isTie ? "Winners" : "Winner"}
                </motion.span>
                <span className="text-white">{names}</span>
                <span className="text-sm font-medium text-emerald-200/75">
                  · {celebration.winnerPoints} pts
                </span>
              </motion.p>
              <motion.p
                className="mt-0.5 text-xs text-emerald-100/70"
                animate={reduce ? undefined : { opacity: [0.55, 1, 0.55] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                🎉 Party mode until the next gameweek kicks off
              </motion.p>
            </div>
          </div>

          <div className="relative z-[2] flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href={`/managers/${primary.entryId}`}
              className={cn(
                buttonVariants({ size: "sm" }),
                "hidden h-8 gap-1.5 rounded-full bg-white/95 px-3 text-xs font-semibold text-emerald-950 hover:bg-amber-50 sm:inline-flex",
              )}
            >
              <Users className="size-3.5" />
              View Team
            </Link>
            <Link
              href="/dressing-room"
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "hidden h-8 gap-1.5 rounded-full border-white/25 bg-white/5 px-3 text-xs font-semibold text-white hover:bg-white/10 hover:text-white md:inline-flex",
              )}
            >
              <MessageSquareText className="size-3.5" />
              Banter
            </Link>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onReplay}
              className="h-8 rounded-full px-2.5 text-xs text-amber-200/90 hover:bg-white/10 hover:text-amber-100"
            >
              Replay
            </Button>
            <Link
              href={`/managers/${primary.entryId}`}
              className="inline-flex size-8 items-center justify-center rounded-full bg-white/10 text-white sm:hidden"
              aria-label={`View ${shortNames}`}
            >
              <Users className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CelebrationOverlay({
  celebration,
  onDismiss,
}: {
  celebration: GwWinnerCelebration;
  onDismiss: () => void;
}) {
  const reduce = useReducedMotion();
  const primary = celebration.winners[0]!;
  const isTie = celebration.winners.length > 1;
  const names = celebration.winners.map((w) => w.name).join(" & ");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gw-winner-title"
      className="fixed inset-0 z-[55] flex items-end justify-center sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.button
        type="button"
        aria-label="Close celebration"
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onDismiss}
      />

      <ConfettiBurst
        celebrationKey={`${celebration.celebrationKey}-burst`}
        enabled
        once
        count={reduce ? 0 : 64}
      />
      <ConfettiRain enabled={!reduce} count={22} />

      <motion.div
        className="relative z-10 flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-white/15 bg-[radial-gradient(ellipse_at_50%_0%,#1a3328_0%,#0c1410_55%,#070b09_100%)] text-white shadow-[0_32px_80px_-16px_rgba(0,0,0,0.7)] sm:rounded-3xl"
        initial={reduce ? false : { opacity: 0, y: 64, scale: 0.9, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        exit={{ opacity: 0, y: 32, scale: 0.96 }}
        transition={{ duration: 0.5, ease: easeOutSoft, delay: 0.05 }}
        style={{ transformPerspective: 1200 }}
      >
        <SparkleField count={14} />
        <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-amber-400/30 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-16 size-48 rounded-full bg-emerald-400/20 blur-3xl" />

        {/* Radial pulse rings */}
        {!reduce ? (
          <>
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-[28%] left-1/2 size-40 -translate-x-1/2 rounded-full border border-amber-300/30"
              initial={{ scale: 0.4, opacity: 0.6 }}
              animate={{ scale: 2.2, opacity: 0 }}
              transition={{ duration: 1.6, delay: 0.35, ease: "easeOut" }}
            />
            <motion.div
              aria-hidden
              className="pointer-events-none absolute top-[28%] left-1/2 size-40 -translate-x-1/2 rounded-full border border-emerald-300/25"
              initial={{ scale: 0.4, opacity: 0.5 }}
              animate={{ scale: 2.6, opacity: 0 }}
              transition={{ duration: 1.9, delay: 0.55, ease: "easeOut" }}
            />
          </>
        ) : null}

        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-3 right-3 z-20 rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>

        <div className="relative flex flex-col items-center px-6 pt-10 pb-8 text-center sm:px-10 sm:pt-12 sm:pb-10">
          <div className="relative mb-6 flex h-36 w-full items-end justify-center sm:mb-8 sm:h-40">
            <motion.div
              className="absolute top-1/2 left-1/2 size-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400/35 blur-2xl sm:size-44"
              initial={reduce ? false : { opacity: 0, scale: 0.3 }}
              animate={{ opacity: [0.35, 0.75, 0.45], scale: 1 }}
              transition={{
                opacity: {
                  duration: 2.2,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.7,
                },
                scale: { duration: 0.6, delay: 0.15, ease: easeOutSoft },
              }}
            />

            <motion.div
              className="relative"
              initial={
                reduce
                  ? false
                  : { scale: 0.05, opacity: 0, y: 60, rotate: -12 }
              }
              animate={{ scale: 1, opacity: 1, y: 0, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 220,
                damping: 14,
                delay: 0.18,
              }}
            >
              <motion.div
                className="rounded-full ring-4 ring-amber-300/55 ring-offset-4 ring-offset-[#0c1410] shadow-[0_0_48px_rgba(251,191,36,0.45)]"
                animate={
                  reduce
                    ? undefined
                    : { boxShadow: [
                        "0 0 32px rgba(251,191,36,0.3)",
                        "0 0 56px rgba(251,191,36,0.55)",
                        "0 0 32px rgba(251,191,36,0.3)",
                      ] }
                }
                transition={{ duration: 2.4, repeat: Infinity }}
              >
                <ManagerAvatar
                  name={primary.name}
                  src={primary.avatarUrl}
                  size="2xl"
                  supportedTeamId={primary.supportedTeamId}
                  supportedTeamCode={primary.supportedTeamCode}
                  avatarVariant={primary.avatarVariant}
                  animated
                />
              </motion.div>

              <motion.div
                className="absolute -top-5 left-1/2 -translate-x-1/2"
                initial={
                  reduce
                    ? false
                    : { y: -120, opacity: 0, rotate: -35, scale: 0.4 }
                }
                animate={{ y: 0, opacity: 1, rotate: [0, -8, 6, 0], scale: 1 }}
                transition={{
                  y: { type: "spring", stiffness: 280, damping: 12, delay: 0.7 },
                  opacity: { delay: 0.7, duration: 0.2 },
                  rotate: {
                    delay: 1.1,
                    duration: 0.7,
                    ease: "easeOut",
                  },
                  scale: { type: "spring", stiffness: 300, damping: 12, delay: 0.7 },
                }}
              >
                <span className="inline-flex size-12 items-center justify-center rounded-full bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 shadow-lg shadow-amber-500/50">
                  {isTie ? (
                    <Trophy className="size-5" />
                  ) : (
                    <Crown className="size-5" />
                  )}
                </span>
              </motion.div>
            </motion.div>

            {isTie
              ? celebration.winners.slice(1, 3).map((w, i) => (
                  <motion.div
                    key={w.entryId}
                    className={cn(
                      "absolute bottom-0",
                      i === 0
                        ? "left-[12%] sm:left-[18%]"
                        : "right-[12%] sm:right-[18%]",
                    )}
                    initial={reduce ? false : { scale: 0, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.5 + i * 0.12,
                      type: "spring",
                      stiffness: 260,
                    }}
                  >
                    <div className="rounded-full ring-2 ring-amber-300/40 ring-offset-2 ring-offset-[#0c1410]">
                      <ManagerAvatar
                        name={w.name}
                        src={w.avatarUrl}
                        size="lg"
                        supportedTeamId={w.supportedTeamId}
                        supportedTeamCode={w.supportedTeamCode}
                        avatarVariant={w.avatarVariant}
                        animated
                      />
                    </div>
                  </motion.div>
                ))
              : null}
          </div>

          <motion.p
            className="text-[11px] font-semibold tracking-[0.22em] text-amber-300 uppercase"
            initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 1.0, duration: 0.4, ease: easeOutSoft }}
          >
            GW{celebration.gameweek} {isTie ? "Winners" : "Winner"}
          </motion.p>

          <motion.h2
            id="gw-winner-title"
            className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl"
            initial={
              reduce ? false : { opacity: 0, y: 20, scale: 0.92, filter: "blur(8px)" }
            }
            animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.12, duration: 0.45, ease: easeOutSoft }}
          >
            {names}
          </motion.h2>

          <motion.p
            className="mt-2 text-sm font-medium text-emerald-200/90"
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.28, type: "spring", stiffness: 300 }}
          >
            {celebration.winnerPoints} pts
          </motion.p>

          <motion.p
            className="mt-3 max-w-sm text-base leading-snug text-white/70"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.38, duration: 0.35, ease: easeOutSoft }}
          >
            {punchline(celebration.gameweek)}
          </motion.p>

          <motion.div
            className="mt-8 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5, duration: 0.35, ease: easeOutSoft }}
          >
            <Link
              href={`/managers/${primary.entryId}`}
              onClick={onDismiss}
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-12 gap-2 rounded-full bg-white font-semibold text-black hover:bg-emerald-50",
              )}
            >
              <Users className="size-4" />
              View Team
            </Link>
            <Link
              href="/dressing-room"
              onClick={onDismiss}
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-12 gap-2 rounded-full border-white/25 bg-white/5 font-semibold text-white hover:bg-white/10 hover:text-white",
              )}
            >
              <MessageSquareText className="size-4" />
              Send Banter
            </Link>
          </motion.div>

          <motion.div
            className="mt-4"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.65 }}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-white/45 hover:bg-transparent hover:text-white/80"
              onClick={onDismiss}
            >
              Close
            </Button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/**
 * Under-navbar winner strip (always while GW celebration is active) +
 * first-visit full celebratory overlay with advanced animation.
 */
export function GwWinnerCelebration({
  celebration,
}: {
  celebration: GwWinnerCelebration;
}) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const primary = celebration.winners[0];

  useEffect(() => {
    try {
      if (sessionStorage.getItem(dismissKey(celebration.celebrationKey)) === "1") {
        setOverlayOpen(false);
      } else {
        setOverlayOpen(true);
      }
    } catch {
      setOverlayOpen(true);
    }
    setReady(true);
  }, [celebration.celebrationKey]);

  function dismissOverlay() {
    setOverlayOpen(false);
    try {
      sessionStorage.setItem(dismissKey(celebration.celebrationKey), "1");
    } catch {
      // ignore
    }
  }

  function replayOverlay() {
    setOverlayOpen(true);
  }

  if (!ready || !primary) return null;

  return (
    <>
      <WinnerNavbarBanner celebration={celebration} onReplay={replayOverlay} />

      <AnimatePresence>
        {overlayOpen ? (
          <CelebrationOverlay
            key="overlay"
            celebration={celebration}
            onDismiss={dismissOverlay}
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
