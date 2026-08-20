"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Crown, Trophy, Volume2, VolumeX } from "lucide-react";
import { ManagerAvatar } from "@/components/league/shared";
import { easeOutSoft } from "@/components/motion/variants";
import {
  CHALLENGE_STATUS,
  isHighStake,
  type ChallengeView,
} from "@/lib/challenges/types";
import { cn } from "@/lib/utils";

export function formatStake(stakeNpr: string | null): string | null {
  if (stakeNpr == null || stakeNpr === "") return null;
  const n = Number(stakeNpr);
  if (!Number.isFinite(n)) return `NPR ${stakeNpr}`;
  return `NPR ${n.toLocaleString()}`;
}

type CrowdIntensity = "calm" | "cheer" | "crazy";

function CrowdStand({
  side,
  intensity,
  reduce,
  dense,
}: {
  side: "left" | "right";
  intensity: CrowdIntensity;
  reduce: boolean | null;
  dense?: boolean;
}) {
  const fans = useMemo(() => {
    const n = dense ? 36 : 22;
    return Array.from({ length: n }, (_, i) => {
      const row = Math.floor(i / (dense ? 12 : 8));
      const col = i % (dense ? 12 : 8);
      return {
        id: i,
        row,
        col,
        hue: (i * 47 + side.length * 13) % 360,
        delay: ((i * 17) % 20) * 0.05,
        size: 0.72 + ((i * 13) % 5) * 0.08,
      };
    });
  }, [dense, side]);

  const bounce =
    intensity === "crazy"
      ? [0, -6, 0, -4, 0]
      : intensity === "cheer"
        ? [0, -3.5, 0]
        : [0, -1.5, 0];
  const duration =
    intensity === "crazy" ? 0.5 : intensity === "cheer" ? 0.85 : 1.7;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-[5%] flex flex-col justify-end gap-[2px] overflow-hidden",
        side === "left" ? "left-[1%] w-[32%]" : "right-[1%] w-[32%]",
        dense ? "h-[26%]" : "h-[22%]",
      )}
      aria-hidden
    >
      {/* Stand seating bands */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a1520]/90 via-[#2a2430]/70 to-transparent" />
      <div className="relative z-[1] flex flex-1 flex-col justify-end gap-0.5 px-0.5 pb-0.5">
        {[0, 1, 2].map((row) => (
          <div
            key={row}
            className={cn(
              "flex items-end justify-between",
              side === "right" && "flex-row-reverse",
            )}
            style={{ opacity: 0.55 + row * 0.18 }}
          >
            {fans
              .filter((f) => f.row === row)
              .map((fan) => (
                <motion.span
                  key={fan.id}
                  className="relative inline-flex flex-col items-center"
                  style={{
                    width: `${(dense ? 7.5 : 11) * fan.size}%`,
                    maxWidth: 14,
                  }}
                  animate={reduce ? undefined : { y: bounce }}
                  transition={{
                    duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: fan.delay + row * 0.08,
                  }}
                >
                  {/* head */}
                  <span
                    className="block aspect-square w-[55%] rounded-full shadow-sm"
                    style={{
                      background: `hsl(${fan.hue} 45% ${42 + (fan.col % 3) * 6}%)`,
                    }}
                  />
                  {/* torso / scarf */}
                  <span
                    className="mt-px block h-[7px] w-[70%] rounded-t-[3px]"
                    style={{
                      background:
                        fan.col % 3 === 0
                          ? `hsl(${fan.hue} 70% 48%)`
                          : fan.col % 3 === 1
                            ? "#e8e4d8"
                            : `hsl(${(fan.hue + 180) % 360} 55% 40%)`,
                    }}
                  />
                </motion.span>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CenterCrowd({
  intensity,
  reduce,
}: {
  intensity: CrowdIntensity;
  reduce: boolean | null;
}) {
  const fans = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        id: i,
        delay: (i % 7) * 0.09,
        hue: (i * 53) % 360,
      })),
    [],
  );
  const bounce =
    intensity === "crazy"
      ? [0, -5, 0]
      : intensity === "cheer"
        ? [0, -3, 0]
        : [0, -1.2, 0];

  return (
    <div
      className="pointer-events-none absolute top-[4%] left-1/2 flex h-[18%] w-[34%] -translate-x-1/2 items-end justify-center gap-0.5 overflow-hidden"
      aria-hidden
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#1c1624]/85 to-transparent" />
      {fans.map((fan) => (
        <motion.span
          key={fan.id}
          className="relative z-[1] inline-flex w-[6%] max-w-[11px] flex-col items-center"
          animate={reduce ? undefined : { y: bounce }}
          transition={{
            duration: intensity === "crazy" ? 0.55 : 1.2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: fan.delay,
          }}
        >
          <span
            className="block aspect-square w-[60%] rounded-full"
            style={{ background: `hsl(${fan.hue} 40% 45%)` }}
          />
          <span
            className="mt-px block h-[6px] w-[75%] rounded-t-[2px]"
            style={{
              background:
                fan.id % 2 === 0
                  ? `hsl(${fan.hue} 65% 50%)`
                  : "rgba(255,255,255,0.75)",
            }}
          />
        </motion.span>
      ))}
    </div>
  );
}

function CornerFlags({ reduce }: { reduce: boolean | null }) {
  return (
    <>
      {(
        [
          { left: "9%", top: "34%", color: "bg-rose-500" },
          { left: "88%", top: "34%", color: "bg-sky-400" },
          { left: "9%", top: "78%", color: "bg-amber-400" },
          { left: "88%", top: "78%", color: "bg-violet-400" },
        ] as const
      ).map((flag) => (
        <motion.div
          key={`${flag.left}-${flag.top}`}
          className="pointer-events-none absolute z-[2]"
          style={{ left: flag.left, top: flag.top }}
          aria-hidden
          animate={reduce ? undefined : { rotate: [-8, 10, -5, 8, -8] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-7 w-[2px] bg-white/70 sm:h-9" />
          <div
            className={cn(
              "absolute top-0 left-0 h-2.5 w-3.5 rounded-[1px] shadow-sm sm:h-3 sm:w-4",
              flag.color,
            )}
          />
        </motion.div>
      ))}
    </>
  );
}

function PitchSurface({ immersive }: { immersive?: boolean }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-0 overflow-hidden",
        immersive ? "top-[28%]" : "top-[32%]",
      )}
      aria-hidden
    >
      {/* Grass base */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(180deg,
              #3d8f4a 0%,
              #2f7a3c 18%,
              #287038 55%,
              #1f5c2e 100%
            )`,
        }}
      />
      {/* Mowing stripes */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `repeating-linear-gradient(
            90deg,
            transparent 0,
            transparent 7%,
            rgba(255,255,255,0.07) 7%,
            rgba(255,255,255,0.07) 14%
          )`,
        }}
      />
      {/* Perspective darkening toward far end */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/20" />
      {/* Soft center highlight under floodlights */}
      <div className="absolute inset-x-[15%] top-[10%] h-[50%] rounded-[50%] bg-emerald-200/10 blur-2xl" />

      <PitchMarkings immersive={immersive} />
      <Goals />
    </div>
  );
}

function PitchMarkings({ immersive }: { immersive?: boolean }) {
  return (
    <svg
      aria-hidden
      className={cn(
        "absolute inset-x-[6%] top-[6%] bottom-[8%] w-[88%] opacity-55",
        immersive && "opacity-65",
      )}
      viewBox="0 0 100 62"
      preserveAspectRatio="none"
    >
      <rect
        x="1.5"
        y="1.5"
        width="97"
        height="59"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="0.65"
      />
      <line
        x1="50"
        y1="1.5"
        x2="50"
        y2="60.5"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="0.55"
      />
      <circle
        cx="50"
        cy="31"
        r="9"
        fill="none"
        stroke="rgba(255,255,255,0.65)"
        strokeWidth="0.55"
      />
      <circle cx="50" cy="31" r="1.1" fill="rgba(255,255,255,0.75)" />
      {/* Penalty boxes */}
      <rect
        x="1.5"
        y="16"
        width="14"
        height="30"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="0.5"
      />
      <rect
        x="84.5"
        y="16"
        width="14"
        height="30"
        fill="none"
        stroke="rgba(255,255,255,0.55)"
        strokeWidth="0.5"
      />
      {/* Six-yard boxes */}
      <rect
        x="1.5"
        y="22"
        width="5.5"
        height="18"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.45"
      />
      <rect
        x="93"
        y="22"
        width="5.5"
        height="18"
        fill="none"
        stroke="rgba(255,255,255,0.45)"
        strokeWidth="0.45"
      />
      {/* Penalty spots */}
      <circle cx="10" cy="31" r="0.7" fill="rgba(255,255,255,0.7)" />
      <circle cx="90" cy="31" r="0.7" fill="rgba(255,255,255,0.7)" />
      {/* Penalty arcs */}
      <path
        d="M15.5 22.5 A 7 7 0 0 1 15.5 39.5"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.45"
      />
      <path
        d="M84.5 22.5 A 7 7 0 0 0 84.5 39.5"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.45"
      />
    </svg>
  );
}

function Goals() {
  return (
    <>
      {/* Left goal */}
      <div
        className="absolute top-[38%] left-[4%] z-[1] h-[24%] w-[3.5%] min-w-[10px]"
        aria-hidden
      >
        <div className="absolute inset-y-[8%] left-0 w-[2px] bg-white/80" />
        <div className="absolute top-[8%] right-0 bottom-[8%] left-[2px] border border-white/35 bg-white/[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
        <div className="absolute top-[8%] right-0 left-0 h-[2px] bg-white/85" />
        <div className="absolute right-0 bottom-[8%] left-0 h-[2px] bg-white/70" />
      </div>
      {/* Right goal */}
      <div
        className="absolute top-[38%] right-[4%] z-[1] h-[24%] w-[3.5%] min-w-[10px]"
        aria-hidden
      >
        <div className="absolute inset-y-[8%] right-0 w-[2px] bg-white/80" />
        <div
          className="absolute top-[8%] right-[2px] bottom-[8%] left-0 border border-white/35 bg-white/[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
            backgroundSize: "4px 4px",
          }}
        />
        <div className="absolute top-[8%] right-0 left-0 h-[2px] bg-white/85" />
        <div className="absolute right-0 bottom-[8%] left-0 h-[2px] bg-white/70" />
      </div>
    </>
  );
}

function Floodlights({ reduce }: { reduce: boolean | null }) {
  return (
    <>
      {/* Light towers glow */}
      <motion.div
        aria-hidden
        className="absolute top-0 left-[8%] h-40 w-40 -translate-x-1/2 rounded-full bg-amber-50/20 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.35, 0.65, 0.4] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute top-0 right-[8%] h-40 w-40 translate-x-1/2 rounded-full bg-amber-50/20 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.55, 0.35, 0.6] }}
        transition={{
          duration: 3.8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.5,
        }}
      />
      {/* Beam cones */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 left-[6%] h-[70%] w-[28%] opacity-30"
        style={{
          background:
            "linear-gradient(165deg, rgba(255,248,220,0.35) 0%, transparent 62%)",
          clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-0 right-[6%] h-[70%] w-[28%] opacity-30"
        style={{
          background:
            "linear-gradient(195deg, rgba(255,248,220,0.35) 0%, transparent 62%)",
          clipPath: "polygon(40% 0, 60% 0, 100% 100%, 0 100%)",
        }}
      />
    </>
  );
}

export function StadiumShell({
  children,
  status,
  highStake,
  crazy,
  className,
  compact,
  immersive,
}: {
  children: React.ReactNode;
  status: string;
  highStake?: boolean;
  crazy?: boolean;
  className?: string;
  compact?: boolean;
  /** Taller pitch + denser crowds for the create ticket. */
  immersive?: boolean;
}) {
  const reduce = useReducedMotion();
  const intensity: CrowdIntensity = crazy
    ? "crazy"
    : status === CHALLENGE_STATUS.ACCEPTED ||
        status === CHALLENGE_STATUS.COMPLETED
      ? "cheer"
      : "calm";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-[0_24px_60px_-24px_rgba(0,0,0,0.7)] ring-1 ring-emerald-950/40",
        immersive
          ? "min-h-[28rem] sm:min-h-[32rem]"
          : compact
            ? "min-h-[12rem]"
            : "min-h-[15rem] sm:min-h-[17rem]",
        className,
      )}
    >
      {/* Night sky / stadium bowl */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#3a4a5c_0%,#1a2430_35%,#0c1218_100%)]" />
      {/* Upper stand wash */}
      <div className="absolute inset-x-0 top-0 h-[32%] bg-gradient-to-b from-[#2a2230]/90 via-[#1e1824]/50 to-transparent" />

      <Floodlights reduce={reduce} />

      <CrowdStand
        side="left"
        intensity={intensity}
        reduce={reduce}
        dense={immersive}
      />
      <CrowdStand
        side="right"
        intensity={intensity}
        reduce={reduce}
        dense={immersive}
      />
      {immersive ? (
        <CenterCrowd intensity={intensity} reduce={reduce} />
      ) : null}

      <PitchSurface immersive={immersive} />
      <CornerFlags reduce={reduce} />

      {highStake ? (
        <motion.div
          aria-hidden
          className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_50%_45%,rgba(251,191,36,0.2),transparent_55%)]"
          animate={reduce ? undefined : { opacity: [0.45, 1, 0.55] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
      ) : null}

      {/* Roof / terrace rim */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[3] h-3 bg-gradient-to-b from-black/50 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10 bg-gradient-to-t from-black/45 to-transparent" />

      <div className="relative z-10">{children}</div>
    </div>
  );
}

export function MatchVersus({
  challenge,
  size = "md",
}: {
  challenge: ChallengeView;
  size?: "sm" | "md" | "lg";
}) {
  const reduce = useReducedMotion();
  const completed = challenge.status === CHALLENGE_STATUS.COMPLETED;
  const leftWon = completed && challenge.winnerId === challenge.creatorId;
  const rightWon = completed && challenge.winnerId === challenge.opponentId;
  const avatarSize = size === "lg" ? "lg" : size === "sm" ? "sm" : "md";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:gap-4 sm:px-5">
      <ManagerSide
        name={challenge.creatorName}
        align="right"
        won={leftWon}
        lost={completed && rightWon}
        avatarSize={avatarSize}
      />
      <motion.div
        className={cn(
          "relative flex flex-col items-center",
          size === "lg" && "scale-110",
        )}
        initial={reduce ? false : { scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.45, ease: easeOutSoft }}
      >
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[11px] font-black tracking-wider text-emerald-950 shadow-[0_0_20px_rgba(251,191,36,0.45)] ring-2 ring-white/40 sm:size-12 sm:text-xs">
          VS
        </span>
      </motion.div>
      <ManagerSide
        name={challenge.opponentName}
        align="left"
        won={rightWon}
        lost={completed && leftWon}
        avatarSize={avatarSize}
      />
    </div>
  );
}

function ManagerSide({
  name,
  align,
  won,
  lost,
  avatarSize,
}: {
  name: string;
  align: "left" | "right";
  won?: boolean;
  lost?: boolean;
  avatarSize: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2",
        align === "right" ? "flex-row-reverse text-right" : "text-left",
        lost && "opacity-50 grayscale",
      )}
    >
      <div className="relative shrink-0">
        <span
          className={cn(
            "absolute inset-0 rounded-full",
            won && "animate-pulse bg-amber-400/40 blur-md",
          )}
        />
        <ManagerAvatar
          name={name}
          size={avatarSize}
          className="relative ring-2 ring-white/40"
        />
        {won ? (
          <span className="absolute -top-1.5 -right-1.5 inline-flex size-5 items-center justify-center rounded-full bg-amber-400 text-emerald-950 shadow-md">
            <Crown className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-bold text-white drop-shadow sm:text-base",
            won && "text-amber-200",
          )}
        >
          {name.split(" ")[0]}
        </p>
        <p className="truncate text-[10px] text-emerald-100/60 sm:text-[11px]">
          {name}
        </p>
      </div>
    </div>
  );
}

export function MatchMeta({
  challenge,
  className,
}: {
  challenge: ChallengeView;
  className?: string;
}) {
  const stake = formatStake(challenge.stakeNpr);
  const high = isHighStake(challenge.stakeNpr);

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-2",
        className,
      )}
    >
      <StatusChip status={challenge.status} />
      {challenge.gameweek != null ? (
        <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/80 uppercase backdrop-blur-sm">
          GW{challenge.gameweek}
        </span>
      ) : null}
      {stake ? (
        <span
          className={cn(
            "rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums backdrop-blur-sm",
            high
              ? "bg-amber-400 text-emerald-950 shadow-[0_0_16px_rgba(251,191,36,0.55)]"
              : "bg-black/35 text-amber-200",
          )}
        >
          {stake}
          {high ? " · BIG BAJI" : ""}
        </span>
      ) : null}
    </div>
  );
}

export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    [CHALLENGE_STATUS.PENDING]: {
      label: "Pending",
      className: "bg-amber-500/90 text-amber-950",
    },
    [CHALLENGE_STATUS.ACCEPTED]: {
      label: "Live",
      className: "bg-emerald-400 text-emerald-950",
    },
    [CHALLENGE_STATUS.COMPLETED]: {
      label: "Full-time",
      className: "bg-white text-emerald-950",
    },
    [CHALLENGE_STATUS.DECLINED]: {
      label: "Darayo",
      className: "bg-rose-500/90 text-white",
    },
    [CHALLENGE_STATUS.CANCELLED]: {
      label: "Cancelled",
      className: "bg-white/20 text-white/80",
    },
  };
  const item = map[status] ?? {
    label: status,
    className: "bg-white/20 text-white",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase",
        item.className,
      )}
    >
      {item.label}
    </span>
  );
}

export function FullTimeBanner({
  winnerName,
  highStake,
}: {
  winnerName: string;
  highStake?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-md items-center justify-center gap-2 rounded-xl border px-3 py-2 text-center",
        highStake
          ? "border-amber-300/50 bg-amber-400/25 text-amber-50"
          : "border-white/20 bg-black/40 text-white",
      )}
    >
      <Trophy
        className={cn(
          "size-4",
          highStake ? "text-amber-200" : "text-amber-300",
        )}
      />
      <p className="text-sm font-semibold">
        Full-time · <span className="text-amber-200">{winnerName}</span> wins
      </p>
    </div>
  );
}

export function MuteToggle({
  muted,
  onToggle,
}: {
  muted: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/30 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white/70 uppercase backdrop-blur-sm hover:bg-black/45 hover:text-white"
      aria-label={muted ? "Unmute Baaji sounds" : "Mute Baaji sounds"}
    >
      {muted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
      {muted ? "Muted" : "Sound"}
    </button>
  );
}
