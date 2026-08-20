"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { TauntActionId } from "@/lib/chat/taunts";

export type SeatMood = "sleeping" | "idle" | "talking";

const KITS = [
  { primary: "#0d5c3a", secondary: "#f0c14a", shorts: "#0a3d28", socks: "#0d5c3a" },
  { primary: "#1a3a6e", secondary: "#e8eef5", shorts: "#122848", socks: "#1a3a6e" },
  { primary: "#8b1e2d", secondary: "#f5d0d4", shorts: "#5c1420", socks: "#8b1e2d" },
  { primary: "#2a2648", secondary: "#c4b5fd", shorts: "#1a1730", socks: "#2a2648" },
  { primary: "#0e4a56", secondary: "#f4a261", shorts: "#0a323a", socks: "#0e4a56" },
  { primary: "#4a3018", secondary: "#e9c46a", shorts: "#2e1e10", socks: "#4a3018" },
] as const;

function kitFor(id: number) {
  return KITS[Math.abs(id) % KITS.length]!;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function hitMotion(hit: TauntActionId | undefined, reduce: boolean | null) {
  if (!hit || reduce) return undefined;
  switch (hit) {
    case "slap":
      return { x: [0, -10, 8, -4, 0], rotate: [0, -12, 8, -4, 0] };
    case "kick":
      return { x: [0, 14, 10], y: [0, -6, 8], rotate: [0, 18, 28] };
    case "tease":
      return { rotate: [0, -6, 6, -4, 4, 0], scale: [1, 1.04, 1] };
    case "laugh":
      return { y: [0, -4, 0, -3, 0], rotate: [0, -3, 3, 0] };
    case "bottle":
      return { x: [0, -6, 10, -4, 0], rotate: [0, -8, 12, 0] };
    case "boo":
      return { y: [0, 4, 2], scale: [1, 0.94, 0.96], rotate: [0, 4, 2] };
    case "clap":
      return { rotate: [0, -2, 2, 0], y: [0, -2, 0] };
    case "roast":
      return { scale: [1, 1.08, 0.97, 1.04, 1], rotate: [0, -5, 5, 0] };
    default:
      return { x: [0, -4, 4, 0] };
  }
}

/**
 * Detailed seated manager on a wooden bench — locker-room presence,
 * not a flat icon.
 */
export function CartoonSeat({
  managerId,
  displayName,
  mood,
  isMe,
  side,
  compact,
  hit,
  selected,
  interactive,
  onSelect,
  verified = true,
}: {
  managerId: number;
  displayName: string;
  mood: SeatMood;
  isMe?: boolean;
  side: "top" | "bottom" | "left" | "right";
  compact?: boolean;
  hit?: TauntActionId;
  selected?: boolean;
  interactive?: boolean;
  onSelect?: () => void;
  /** Claimed account — unverified seats render muted. */
  verified?: boolean;
}) {
  const reduce = useReducedMotion();
  const kit = kitFor(managerId);
  const label = isMe ? "You" : displayName.split(" ")[0];
  const canClick = Boolean(interactive && onSelect && !isMe);

  return (
    <motion.div
      layout
      className={cn(
        "relative flex flex-col items-center",
        isMe && "z-10",
        selected && "z-30",
        compact ? "scale-[0.82]" : "scale-100",
        !verified && "opacity-45 grayscale",
      )}
    >
      <motion.button
        type="button"
        disabled={!canClick}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.();
        }}
        className={cn(
          "relative rounded-xl outline-none transition-[box-shadow,transform]",
          canClick &&
            "cursor-pointer hover:scale-[1.04] focus-visible:ring-2 focus-visible:ring-amber-400/70",
          !canClick && "cursor-default",
          isMe &&
            "ring-2 ring-amber-400/50 ring-offset-2 ring-offset-[#1a120c] shadow-[0_0_24px_rgba(251,191,36,0.25)]",
          selected && "ring-2 ring-emerald-400/60",
        )}
        animate={hitMotion(hit, reduce)}
        transition={{ duration: 0.55, ease: "easeOut" }}
        aria-label={
          canClick ? `Taunt ${displayName}` : displayName
        }
      >
        <svg
          viewBox="0 0 80 110"
          className={cn(
            compact ? "h-[72px] w-[52px]" : "h-[88px] w-[64px]",
            "drop-shadow-[0_8px_12px_rgba(0,0,0,0.45)]",
          )}
          aria-hidden
        >
          <defs>
            <linearGradient id={`bench-${managerId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b6914" />
              <stop offset="40%" stopColor="#6b4f12" />
              <stop offset="100%" stopColor="#4a360c" />
            </linearGradient>
            <linearGradient id={`skin-${managerId}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f5d0a9" />
              <stop offset="100%" stopColor="#d4a574" />
            </linearGradient>
            <linearGradient id={`jersey-${managerId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={kit.primary} stopOpacity="1" />
              <stop offset="100%" stopColor={kit.primary} stopOpacity="0.75" />
            </linearGradient>
            <filter id={`soft-${managerId}`}>
              <feGaussianBlur stdDeviation="1.2" />
            </filter>
          </defs>

          <ellipse
            cx="40"
            cy="104"
            rx="28"
            ry="5"
            fill="rgba(0,0,0,0.35)"
            filter={`url(#soft-${managerId})`}
          />

          <rect x="4" y="72" width="72" height="10" rx="2" fill={`url(#bench-${managerId})`} />
          <rect x="6" y="70" width="68" height="4" rx="1" fill="#a67c1a" opacity="0.9" />
          <rect x="10" y="82" width="7" height="18" rx="1" fill="#3d2a0a" />
          <rect x="63" y="82" width="7" height="18" rx="1" fill="#3d2a0a" />
          <rect x="8" y="80" width="64" height="2" fill="#2a1c06" opacity="0.5" />

          <g>
            <rect x="26" y="68" width="9" height="22" rx="3" fill={kit.shorts} />
            <rect x="45" y="68" width="9" height="22" rx="3" fill={kit.shorts} />
            <rect x="26" y="86" width="9" height="12" rx="2" fill={kit.socks} />
            <rect x="45" y="86" width="9" height="12" rx="2" fill={kit.socks} />
            <ellipse cx="30.5" cy="100" rx="7" ry="3.5" fill="#1a1a1a" />
            <ellipse cx="49.5" cy="100" rx="7" ry="3.5" fill="#1a1a1a" />
          </g>

          <motion.g
            animate={
              reduce || mood === "sleeping"
                ? undefined
                : { scaleY: [1, 1.025, 1], scaleX: [1, 1.01, 1] }
            }
            transition={{ duration: mood === "talking" ? 0.9 : 3.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: "40px 52px" }}
          >
            <path
              d="M22 42 Q22 68 28 70 L52 70 Q58 68 58 42 Q50 38 40 38 Q30 38 22 42Z"
              fill={`url(#jersey-${managerId})`}
            />
            <path d="M28 40 L40 44 L52 40" stroke={kit.secondary} strokeWidth="2.5" fill="none" />
            <rect x="36" y="48" width="8" height="14" rx="1" fill={kit.secondary} opacity="0.85" />
            <text
              x="40"
              y="59"
              textAnchor="middle"
              fill="#0a0a0a"
              fontSize="7"
              fontWeight="800"
              opacity="0.7"
            >
              {initials(displayName).slice(0, 2)}
            </text>

            {mood === "talking" ? (
              <>
                <motion.g
                  animate={{ rotate: [0, -20, 8, 0] }}
                  transition={{ duration: 0.55, repeat: Infinity }}
                  style={{ transformOrigin: "24px 48px" }}
                >
                  <path
                    d="M24 48 Q12 42 14 30"
                    stroke={kit.primary}
                    strokeWidth="7"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <circle cx="14" cy="28" r="4" fill={`url(#skin-${managerId})`} />
                </motion.g>
                <path
                  d="M56 48 Q62 56 58 64"
                  stroke={kit.primary}
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="57" cy="66" r="4" fill={`url(#skin-${managerId})`} />
              </>
            ) : mood === "sleeping" ? (
              <>
                <path
                  d="M24 48 Q18 58 22 64"
                  stroke={kit.primary}
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M56 48 Q62 58 58 64"
                  stroke={kit.primary}
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
              </>
            ) : (
              <>
                <path
                  d="M24 48 Q16 58 20 66"
                  stroke={kit.primary}
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M56 48 Q64 58 60 66"
                  stroke={kit.primary}
                  strokeWidth="7"
                  strokeLinecap="round"
                  fill="none"
                />
                <circle cx="19" cy="68" r="3.5" fill={`url(#skin-${managerId})`} />
                <circle cx="61" cy="68" r="3.5" fill={`url(#skin-${managerId})`} />
              </>
            )}
          </motion.g>

          <motion.g
            animate={
              reduce
                ? undefined
                : hit
                  ? hit === "boo" || hit === "kick"
                    ? { rotate: 12, y: 3 }
                    : undefined
                  : mood === "sleeping"
                    ? { rotate: 18, y: 4 }
                    : mood === "idle"
                      ? { rotate: [-3, 4, -2, 0], x: [0, 1, -1, 0] }
                      : { rotate: [-2, 2, -2] }
            }
            transition={
              hit
                ? { duration: 0.4 }
                : mood === "sleeping"
                  ? { duration: 0.4 }
                  : {
                      duration: mood === "talking" ? 1.2 : 5,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: (managerId % 4) * 0.3,
                    }
            }
            style={{ transformOrigin: "40px 28px" }}
          >
            <circle cx="40" cy="26" r="15" fill={`url(#skin-${managerId})`} />
            <path
              d="M26 22 Q28 10 40 9 Q52 10 54 22 Q48 14 40 13 Q32 14 26 22Z"
              fill="#2a1c12"
            />
            <ellipse cx="25" cy="27" rx="2.5" ry="3.5" fill="#d4a574" />
            <ellipse cx="55" cy="27" rx="2.5" ry="3.5" fill="#d4a574" />

            {hit === "slap" || hit === "bottle" || hit === "kick" ? (
              <>
                <path
                  d="M32 24 Q36 22 40 24"
                  stroke="#5c4030"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M40 24 Q44 22 48 24"
                  stroke="#5c4030"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
                <ellipse cx="40" cy="34" rx="4" ry="3" fill="#5c2030" />
                <circle cx="50" cy="30" r="3" fill="#e87a7a" opacity="0.55" />
              </>
            ) : hit === "roast" || hit === "boo" ? (
              <>
                <path d="M32 24 L36 28 M36 24 L32 28" stroke="#1a1a1a" strokeWidth="1.6" />
                <path d="M44 24 L48 28 M48 24 L44 28" stroke="#1a1a1a" strokeWidth="1.6" />
                <path
                  d="M34 35 Q40 30 46 35"
                  stroke="#5c2030"
                  strokeWidth="1.8"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            ) : mood === "sleeping" ? (
              <>
                <path
                  d="M32 26 Q36 24 40 26"
                  stroke="#5c4030"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d="M40 26 Q44 24 48 26"
                  stroke="#5c4030"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
                <ellipse cx="40" cy="33" rx="3" ry="1.5" fill="#c97b84" opacity="0.45" />
              </>
            ) : (
              <>
                <motion.g
                  animate={
                    reduce
                      ? undefined
                      : { scaleY: [1, 1, 0.08, 1] }
                  }
                  transition={{
                    duration: 4,
                    times: [0, 0.9, 0.94, 1],
                    repeat: Infinity,
                    delay: (managerId % 5) * 0.5,
                  }}
                  style={{ transformOrigin: "40px 26px" }}
                >
                  <ellipse cx="34" cy="26" rx="2.4" ry="2.8" fill="#1a1a1a" />
                  <ellipse cx="46" cy="26" rx="2.4" ry="2.8" fill="#1a1a1a" />
                  <circle cx="34.6" cy="25.2" r="0.7" fill="#fff" />
                  <circle cx="46.6" cy="25.2" r="0.7" fill="#fff" />
                </motion.g>
                {mood === "talking" ? (
                  <motion.ellipse
                    cx="40"
                    cy="34"
                    fill="#5c2030"
                    animate={{ ry: [1.5, 3.8, 1.5], rx: [3, 4.2, 3] }}
                    transition={{ duration: 0.32, repeat: Infinity }}
                  />
                ) : (
                  <path
                    d="M35 33 Q40 36 45 33"
                    stroke="#5c4030"
                    strokeWidth="1.5"
                    fill="none"
                    strokeLinecap="round"
                  />
                )}
              </>
            )}
          </motion.g>
        </svg>

        <AnimatePresence>
          {mood === "sleeping" && !reduce && !hit ? (
            <motion.span
              className="pointer-events-none absolute top-0 right-0 text-[11px] font-semibold text-sky-200/70"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: [0, 1, 0], y: [4, -10, -18], x: [0, 6, 10] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity }}
            >
              zzz
            </motion.span>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {hit === "bottle" && !reduce ? (
            <motion.span
              className="pointer-events-none absolute -top-1 left-0 text-lg"
              initial={{ x: -28, y: -20, rotate: -40, opacity: 1 }}
              animate={{ x: 18, y: 20, rotate: 50, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45 }}
            >
              🧴
            </motion.span>
          ) : null}
          {hit === "slap" && !reduce ? (
            <motion.span
              className="pointer-events-none absolute top-2 left-1/2 text-xl"
              initial={{ scale: 0.4, opacity: 1, x: "-50%" }}
              animate={{ scale: 1.4, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              💥
            </motion.span>
          ) : null}
          {hit === "roast" && !reduce ? (
            <motion.span
              className="pointer-events-none absolute top-0 left-1/2 text-base"
              initial={{ y: 8, opacity: 0, x: "-50%" }}
              animate={{ y: -12, opacity: [0, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9 }}
            >
              🔥
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>

      <p
        className={cn(
          "mt-0.5 max-w-[4.75rem] truncate text-center text-[9px] font-semibold leading-tight tracking-wide",
          isMe ? "text-amber-200" : "text-white/80",
          canClick && "underline decoration-white/20 underline-offset-2",
          compact && "max-w-[3.6rem] text-[8px]",
        )}
        title={displayName}
      >
        {label}
      </p>
      <span className="sr-only">{side}</span>
    </motion.div>
  );
}
