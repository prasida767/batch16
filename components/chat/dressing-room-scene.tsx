"use client";

import { useMemo, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CartoonSeat,
  type SeatMood,
} from "@/components/chat/cartoon-seat";
import { TauntMenu } from "@/components/chat/taunt-menu";
import type { ChatRosterSeat } from "@/lib/chat/types";
import { distributeSeats, type SeatLayout } from "@/lib/chat/seating";
import { tauntMeta, type TauntActionId, type TauntEvent } from "@/lib/chat/taunts";
import { cn } from "@/lib/utils";

export type { SeatLayout };
export { distributeSeats };

function moodFor(
  managerId: number,
  onlineIds: Set<number>,
  typingIds: Set<number>,
  speakingIds: Set<number>,
): SeatMood {
  if (typingIds.has(managerId) || speakingIds.has(managerId)) return "talking";
  if (onlineIds.has(managerId)) return "idle";
  return "sleeping";
}

function LockerUnit({ index }: { index: number }) {
  const ajar = index % 5 === 2;
  return (
    <div className="relative h-16 w-7 overflow-hidden rounded-sm border border-black/40 bg-gradient-to-b from-[#4a5560] via-[#343c46] to-[#232830] shadow-inner sm:h-20 sm:w-8">
      <div className="absolute inset-x-0 top-0 h-px bg-white/15" />
      <div className="absolute top-2 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-amber-400/70 shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
      <div className="absolute top-5 right-1 h-3 w-1 rounded-sm bg-[#1a1f24]" />
      {ajar ? (
        <div className="absolute inset-y-1 right-0 w-[55%] rounded-r-sm border-l border-black/30 bg-gradient-to-l from-[#2a323a] to-[#3a4450] opacity-90" />
      ) : null}
      <div className="absolute inset-x-1 bottom-2 h-5 rounded-[1px] bg-black/20" />
    </div>
  );
}

function HangingKit({ hue }: { hue: string }) {
  return (
    <div className="relative flex flex-col items-center opacity-70">
      <div className="h-1.5 w-1.5 rounded-full bg-[#c4a574]" />
      <div className="h-2 w-px bg-[#8a7355]" />
      <div
        className="h-8 w-6 rounded-t-md shadow-md sm:h-10 sm:w-7"
        style={{
          background: `linear-gradient(160deg, ${hue}, color-mix(in srgb, ${hue} 70%, #000))`,
        }}
      >
        <div className="mx-auto mt-1 h-1 w-4 rounded-sm bg-white/25" />
      </div>
    </div>
  );
}

function BootsPair({ className }: { className?: string }) {
  return (
    <svg
      className={cn("opacity-60 drop-shadow-md", className)}
      width="44"
      height="22"
      viewBox="0 0 44 22"
      aria-hidden
    >
      <ellipse cx="12" cy="18" rx="11" ry="3.5" fill="rgba(0,0,0,0.35)" />
      <path d="M3 14 Q5 4 16 5 L18 17 Q10 19 3 14Z" fill="#1c1c1c" />
      <path d="M8 8h6" stroke="#333" strokeWidth="1" />
      <ellipse cx="32" cy="18" rx="11" ry="3.5" fill="rgba(0,0,0,0.35)" />
      <path d="M23 14 Q25 4 36 5 L38 17 Q30 19 23 14Z" fill="#222" />
      <path d="M28 8h6" stroke="#444" strokeWidth="1" />
    </svg>
  );
}

function WaterBottle({ className }: { className?: string }) {
  return (
    <div className={cn("relative opacity-55", className)}>
      <div className="mx-auto h-2 w-2 rounded-t-sm bg-[#2a6b4e]" />
      <div className="h-7 w-3 rounded-b-md bg-gradient-to-b from-[#3d9b6e]/90 to-[#1e4d38] shadow-sm" />
    </div>
  );
}

function TacticalBoard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-[#5c4a32]/60 bg-gradient-to-br from-[#2a4a38] to-[#1a3026] p-1.5 shadow-lg",
        className,
      )}
    >
      <div className="relative h-12 w-16 overflow-hidden rounded-[2px] border border-white/10 sm:h-14 sm:w-20">
        <div className="absolute inset-[12%] rounded-[1px] border border-white/20" />
        <div className="absolute top-1/2 left-[12%] right-[12%] h-px bg-white/25" />
        <div className="absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/30" />
        <span className="absolute top-0.5 left-1 text-[5px] text-white/40">4-3-3</span>
      </div>
    </div>
  );
}

function RoomEnvironment({
  reduce,
  immersive,
}: {
  reduce: boolean | null;
  immersive?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          immersive
            ? "bg-[radial-gradient(ellipse_at_50%_15%,#5a3e2a_0%,#2e1e14_40%,#120e0b_75%,#050403_100%)]"
            : "bg-[radial-gradient(ellipse_at_50%_18%,#4a3424_0%,#2a1c14_38%,#120e0b_72%,#080605_100%)]",
        )}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 h-[28%] bg-gradient-to-b from-[#5c4030]/35 to-transparent" />

      <div
        className="pointer-events-none absolute inset-x-[-10%] bottom-0 h-[42%] origin-bottom"
        style={{
          transform: "perspective(600px) rotateX(52deg)",
          background: `
            repeating-linear-gradient(
              90deg,
              #3d2a1a 0px,
              #3d2a1a 18px,
              #2e1f12 18px,
              #2e1f12 20px
            ),
            linear-gradient(180deg, #4a3424, #1a120c)
          `,
          boxShadow: "inset 0 40px 60px rgba(0,0,0,0.45)",
        }}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

      <div className="pointer-events-none absolute top-3 right-4 left-4 flex justify-center gap-0.5 opacity-80 sm:top-4">
        {Array.from({ length: immersive ? 14 : 10 }, (_, i) => (
          <LockerUnit key={i} index={i} />
        ))}
      </div>

      <div className="pointer-events-none absolute top-[4.5rem] left-6 hidden gap-3 sm:flex lg:left-10">
        <HangingKit hue="#0d5c3a" />
        <HangingKit hue="#1a3a6e" />
        <HangingKit hue="#8b1e2d" />
      </div>
      <div className="pointer-events-none absolute top-[4.5rem] right-6 hidden gap-3 sm:flex lg:right-10">
        <HangingKit hue="#0e4a56" />
        <HangingKit hue="#4a3018" />
      </div>

      <div className="pointer-events-none absolute top-[5.25rem] left-1/2 hidden -translate-x-1/2 sm:block">
        <div className="rounded border border-amber-600/30 bg-[#1a140e]/80 px-3 py-0.5 text-[9px] font-semibold tracking-[0.28em] text-amber-200/50 uppercase shadow-md backdrop-blur-[2px]">
          Batch 16 · Home
        </div>
      </div>

      <div className="pointer-events-none absolute top-1/3 left-1.5 hidden opacity-70 lg:block">
        <TacticalBoard />
      </div>

      <BootsPair className="pointer-events-none absolute bottom-3 left-4 sm:bottom-4 sm:left-8" />
      <BootsPair className="pointer-events-none absolute right-4 bottom-3 sm:right-8 sm:bottom-4" />
      <WaterBottle className="pointer-events-none absolute bottom-8 left-16 sm:left-24" />
      <WaterBottle className="pointer-events-none absolute right-16 bottom-9 sm:right-28" />

      <div className="pointer-events-none absolute top-1 left-1/2 flex -translate-x-1/2 gap-8 opacity-80">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="relative"
            animate={
              reduce ? undefined : { opacity: [0.75, 1, 0.82, 1, 0.75] }
            }
            transition={{
              duration: 4.5 + i * 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.4,
            }}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-[#c4a574]/40" />
            <div className="mx-auto h-16 w-24 rounded-full bg-amber-200/10 blur-2xl" />
          </motion.div>
        ))}
      </div>

      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-[18%] left-1/2 h-56 w-72 -translate-x-1/2 rounded-full bg-amber-100/10 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.35, 0.55, 0.4] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {!reduce ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {Array.from({ length: immersive ? 12 : 8 }, (_, i) => (
            <motion.span
              key={i}
              className="absolute size-0.5 rounded-full bg-amber-100/40"
              style={{ left: `${12 + i * 11}%`, top: `${30 + (i % 4) * 12}%` }}
              animate={{
                y: [0, -20, 0],
                opacity: [0, 0.7, 0],
              }}
              transition={{
                duration: 5 + i * 0.4,
                delay: i * 0.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      ) : null}

      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/40 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/40 to-transparent" />
    </>
  );
}

function SeatWithMenu({
  seat,
  mood,
  isMe,
  side,
  compact,
  hit,
  selectedId,
  canTaunt,
  onSelect,
}: {
  seat: ChatRosterSeat;
  mood: SeatMood;
  isMe: boolean;
  side: "top" | "bottom" | "left" | "right";
  compact: boolean;
  hit?: TauntActionId;
  selectedId: number | null;
  canTaunt: boolean;
  onSelect: (id: number | null) => void;
}) {
  const selected = selectedId === seat.managerId;
  return (
    <CartoonSeat
      managerId={seat.managerId}
      displayName={seat.displayName}
      mood={mood}
      isMe={isMe}
      side={side}
      compact={compact}
      hit={hit}
      selected={selected}
      interactive={canTaunt && !isMe && seat.verified}
      verified={seat.verified}
      onSelect={() => onSelect(selected ? null : seat.managerId)}
    />
  );
}

export function DressingRoomScene({
  roster,
  onlineIds,
  typingIds,
  speakingIds,
  currentManagerId,
  hitReactions,
  taunts,
  selectedSeatId,
  onSelectSeat,
  onTaunt,
  canTaunt,
  immersive,
  children,
  className,
}: {
  roster: ChatRosterSeat[];
  onlineIds: Set<number>;
  typingIds: Set<number>;
  speakingIds: Set<number>;
  currentManagerId: number | null;
  hitReactions?: Record<number, TauntActionId>;
  taunts?: TauntEvent[];
  selectedSeatId?: number | null;
  onSelectSeat?: (id: number | null) => void;
  onTaunt?: (action: TauntActionId, seat: ChatRosterSeat) => void;
  canTaunt?: boolean;
  immersive?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const layout = useMemo(() => distributeSeats(roster), [roster]);
  const compact = roster.length > 12 && !immersive;
  const selectedId = selectedSeatId ?? null;
  const select = onSelectSeat ?? (() => {});
  const taunt = onTaunt ?? (() => {});
  const allowTaunt = Boolean(canTaunt);
  const selectedSeat =
    selectedId != null
      ? roster.find((s) => s.managerId === selectedId) ?? null
      : null;

  const seatProps = (
    seat: ChatRosterSeat,
    side: "top" | "bottom" | "left" | "right",
  ) => ({
    seat,
    mood: moodFor(seat.managerId, onlineIds, typingIds, speakingIds),
    isMe: seat.managerId === currentManagerId,
    side,
    compact,
    hit: hitReactions?.[seat.managerId],
    selectedId,
    canTaunt: allowTaunt,
    onSelect: select,
  });

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden",
        className,
      )}
      onClick={() => select(null)}
    >
      <RoomEnvironment reduce={reduce} immersive={immersive} />

      {/* Floating room-wide taunt callouts */}
      <div className="pointer-events-none absolute inset-x-0 top-20 z-30 flex flex-col items-center gap-1 sm:top-24">
        <AnimatePresence>
          {(taunts ?? []).slice(-3).map((t) => {
            const meta = tauntMeta(t.action);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -12, scale: 0.95 }}
                className="rounded-full border border-white/15 bg-black/55 px-3 py-1 text-[11px] font-semibold text-amber-50 shadow-lg backdrop-blur-sm"
              >
                <span className="mr-1">{meta.emoji}</span>
                <span className="text-white/55">{t.fromName.split(" ")[0]}</span>
                {" → "}
                <span className="text-amber-200">{t.toName.split(" ")[0]}</span>
                <span className="ml-1.5 text-emerald-200/90">{meta.float}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div
        className={cn(
          "relative z-10 grid h-full min-h-0 grid-cols-[minmax(3.5rem,auto)_1fr_minmax(3.5rem,auto)] grid-rows-[auto_1fr_auto] gap-1 p-2 sm:gap-2 sm:p-3",
          immersive ? "pt-28 sm:pt-32" : "pt-24 sm:pt-28",
        )}
      >
        <div className="col-start-2 row-start-1 flex items-end justify-center gap-0.5 sm:gap-1.5">
          {layout.top.map((seat) => (
            <SeatWithMenu key={seat.managerId} {...seatProps(seat, "top")} />
          ))}
        </div>

        <div className="col-start-1 row-start-2 flex flex-col items-center justify-center gap-1 sm:gap-1.5">
          {layout.left.map((seat) => (
            <SeatWithMenu key={seat.managerId} {...seatProps(seat, "left")} />
          ))}
        </div>

        <div
          className={cn(
            "col-start-2 row-start-2 flex min-h-0 min-w-0 items-stretch justify-center px-0.5 sm:px-1",
            immersive && "max-w-2xl justify-self-center",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn(
              "relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.75),0_0_0_1px_rgba(180,140,80,0.25)]",
              immersive ? "max-w-xl" : "max-w-md",
            )}
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-[#3a3228] via-[#1e1a16] to-[#12100e] p-[3px]">
              <div className="h-full w-full rounded-[10px] bg-[#070b09]" />
            </div>
            <div className="pointer-events-none absolute inset-[3px] rounded-[10px] bg-[radial-gradient(ellipse_at_50%_0%,rgba(16,185,129,0.12),transparent_55%)]" />
            <div className="pointer-events-none absolute inset-[3px] rounded-[10px] ring-1 ring-inset ring-emerald-500/15" />
            <div className="pointer-events-none absolute top-[5px] right-4 left-4 z-20 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
            <div className="relative z-10 m-[3px] flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-[#0a100e]/95 backdrop-blur-[2px]">
              {children}
            </div>
          </div>
        </div>

        <div className="col-start-3 row-start-2 flex flex-col items-center justify-center gap-1 sm:gap-1.5">
          {layout.right.map((seat) => (
            <SeatWithMenu key={seat.managerId} {...seatProps(seat, "right")} />
          ))}
        </div>

        <div className="col-start-2 row-start-3 flex items-start justify-center gap-0.5 sm:gap-1.5">
          {layout.bottom.map((seat) => (
            <SeatWithMenu key={seat.managerId} {...seatProps(seat, "bottom")} />
          ))}
        </div>
      </div>

      {allowTaunt && selectedSeat && selectedSeat.managerId !== currentManagerId ? (
        <TauntMenu
          targetName={selectedSeat.displayName}
          open
          onClose={() => select(null)}
          onAction={(action) => taunt(action, selectedSeat)}
        />
      ) : allowTaunt ? (
        <p className="pointer-events-none absolute bottom-1 left-1/2 z-20 -translate-x-1/2 text-[9px] tracking-wide text-white/30 uppercase">
          Tap a manager to mess with them
        </p>
      ) : null}
    </div>
  );
}
