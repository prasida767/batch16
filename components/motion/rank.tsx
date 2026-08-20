"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { ReactNode } from "react";
import { springSnappy } from "@/components/motion/variants";
import { rankDelta } from "@/lib/league/format";
import { cn } from "@/lib/utils";

export function AnimatedRankDelta({
  rank,
  lastRank,
}: {
  rank: number;
  lastRank: number;
}) {
  const reduce = useReducedMotion();
  const delta = rankDelta(rank, lastRank);

  if (delta > 0) {
    return (
      <motion.span
        className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400"
        initial={reduce ? false : { y: 4, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={springSnappy}
      >
        <ArrowUpRight className="size-3.5" />
        {delta}
      </motion.span>
    );
  }

  if (delta < 0) {
    return (
      <motion.span
        className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500"
        initial={reduce ? false : { y: -4, opacity: 0, scale: 0.85 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={springSnappy}
      >
        <ArrowDownRight className="size-3.5" />
        {Math.abs(delta)}
      </motion.span>
    );
  }

  return (
    <span className="inline-flex items-center text-xs text-muted-foreground">
      <Minus className="size-3.5" />
    </span>
  );
}

/**
 * Rank cell with flash highlight when rank moves up/down.
 * Use around the rank number (+ optional delta) in tables.
 */
export function RankChange({
  rank,
  lastRank,
  className,
  children,
}: {
  rank: number;
  lastRank: number;
  className?: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const delta = rankDelta(rank, lastRank);
  const rose = delta > 0;

  return (
    <motion.div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 -mx-1.5",
        className,
      )}
      initial={false}
      animate={
        reduce || delta === 0
          ? { backgroundColor: "transparent" }
          : {
              backgroundColor: rose
                ? [
                    "transparent",
                    "color-mix(in oklch, var(--success) 22%, transparent)",
                    "transparent",
                  ]
                : [
                    "transparent",
                    "color-mix(in oklch, var(--destructive) 18%, transparent)",
                    "transparent",
                  ],
            }
      }
      transition={{ duration: 1.1, ease: "easeOut" }}
    >
      {children ?? (
        <>
          <motion.span
            key={rank}
            className="w-4 font-semibold tabular-nums"
            initial={reduce || delta === 0 ? false : { scale: 0.85, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={springSnappy}
          >
            {rank}
          </motion.span>
          <AnimatedRankDelta rank={rank} lastRank={lastRank} />
        </>
      )}
    </motion.div>
  );
}
