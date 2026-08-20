"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PitchSurface } from "@/components/league/pitch-surface";
import { Badge } from "@/components/ui/badge";
import { easeOutSoft, springSnappy } from "@/components/motion/variants";
import type { SquadPlayer } from "@/lib/league/types";
import { cn } from "@/lib/utils";

function PlayerChip({
  player,
  delay = 0,
}: {
  player: SquadPlayer;
  delay?: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="relative flex w-[3.4rem] flex-col items-center text-center sm:w-16"
      initial={reduce ? false : { opacity: 0, y: 8, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, delay, ease: easeOutSoft }}
    >
      <div
        className={cn(
          "relative flex size-9 items-center justify-center rounded-full text-[10px] font-bold shadow-md ring-2 backdrop-blur-sm sm:size-10 sm:text-[11px]",
          player.isCaptain
            ? "bg-amber-300 text-emerald-950 ring-amber-200"
            : "bg-white/90 text-emerald-950 ring-white/70",
        )}
      >
        {player.webName.slice(0, 3).toUpperCase()}
        {player.isCaptain ? (
          <span className="absolute -top-1.5 -right-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[8px] font-bold text-emerald-950 shadow-sm ring-1 ring-amber-200">
            C
          </span>
        ) : null}
        {player.isVice && !player.isCaptain ? (
          <span className="absolute -top-1.5 -right-1 flex size-4 items-center justify-center rounded-full bg-white/90 text-[8px] font-bold text-emerald-900 shadow-sm ring-1 ring-white/80">
            V
          </span>
        ) : null}
      </div>
      <p className="mt-1 w-full truncate text-[10px] font-medium text-white drop-shadow-sm sm:text-[11px]">
        {player.webName}
      </p>
      <p className="text-[9px] tabular-nums text-emerald-100/85 sm:text-[10px]">
        {player.points}
        {player.isCaptain ? "×2" : ""}
      </p>
    </motion.div>
  );
}

function PitchRow({
  players,
  baseDelay,
}: {
  players: SquadPlayer[];
  baseDelay: number;
}) {
  if (players.length === 0) return null;
  return (
    <div className="flex w-full justify-center gap-1 px-1 sm:gap-3">
      {players.map((player, i) => (
        <PlayerChip
          key={player.elementId}
          player={player}
          delay={baseDelay + i * 0.04}
        />
      ))}
    </div>
  );
}

export function TeamPitch({
  starters,
  bench,
  formation,
}: {
  starters: SquadPlayer[];
  bench: SquadPlayer[];
  formation: string;
}) {
  const reduce = useReducedMotion();
  const gk = starters.filter((p) => p.elementType === 1);
  const def = starters.filter((p) => p.elementType === 2);
  const mid = starters.filter((p) => p.elementType === 3);
  const fwd = starters.filter((p) => p.elementType === 4);

  return (
    <div className="space-y-3">
      <div className="relative">
        <PitchSurface
          aspectClassName="aspect-[5/6.2] sm:aspect-[5/6]"
          label={formation || "XI"}
        >
          <div className="flex h-full flex-col justify-between px-2 py-5 sm:px-4 sm:py-6">
            <PitchRow players={fwd} baseDelay={0.05} />
            <PitchRow players={mid} baseDelay={0.12} />
            <PitchRow players={def} baseDelay={0.2} />
            <PitchRow players={gk} baseDelay={0.28} />
          </div>
        </PitchSurface>
        <Badge
          variant="outline"
          className="absolute top-2.5 right-3 z-20 border-white/25 bg-black/25 text-[10px] text-white backdrop-blur-sm"
        >
          Starting XI
        </Badge>
      </div>

      <motion.div
        className="rounded-2xl bg-muted/50 p-3 ring-1 ring-border/60 sm:p-4"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35, ease: easeOutSoft }}
      >
        <p className="mb-3 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
          Bench
        </p>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {bench.map((player, i) => (
            <motion.div
              key={player.elementId}
              className="flex min-w-[7.5rem] flex-1 items-center gap-2 rounded-xl bg-card px-2.5 py-2 shadow-xs ring-1 ring-border/70 sm:min-w-32 sm:flex-none"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                ...springSnappy,
                delay: 0.4 + i * 0.05,
              }}
            >
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {player.positionShort}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{player.webName}</p>
                <p className="text-[11px] text-muted-foreground">
                  {player.teamShort} · {player.points} pts
                  {player.isVice ? " · V" : ""}
                </p>
              </div>
            </motion.div>
          ))}
          {bench.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bench data.</p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
