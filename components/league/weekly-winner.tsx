"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Trophy } from "lucide-react";
import { ConfettiBurst } from "@/components/motion/confetti";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { easeOutSoft } from "@/components/motion/variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function WeeklyWinnerSpotlight({
  gameweek,
  winnerNames,
  winnerPoints,
  celebrate = true,
}: {
  gameweek: number;
  winnerNames: string[];
  winnerPoints: number;
  celebrate?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <>
      {celebrate ? (
        <ConfettiBurst celebrationKey={`weekly-winner-gw-${gameweek}`} />
      ) : null}
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, ease: easeOutSoft }}
        className="rounded-xl bg-primary/8 p-4 ring-1 ring-primary/15"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-medium tracking-wide text-primary uppercase">
            GW {gameweek} winner
            {winnerNames.length > 1 ? "s" : ""}
          </p>
          <motion.span
            animate={
              reduce
                ? undefined
                : { rotate: [0, -8, 8, -4, 0], scale: [1, 1.1, 1] }
            }
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <Trophy className="size-4 text-primary" />
          </motion.span>
        </div>
        <p className="mt-1 text-xl font-semibold">
          {winnerNames.join(" · ") || "—"}
        </p>
        <p className="text-sm text-muted-foreground">
          <AnimatedNumber value={winnerPoints} /> points
        </p>
      </motion.div>
    </>
  );
}

export function WeeklyWinnerCard({
  gameweek,
  winnerNames,
  winnerPoints,
  splitLabel,
  celebrate = false,
}: {
  gameweek: number;
  winnerNames: string[];
  winnerPoints: number;
  splitLabel?: string;
  celebrate?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileHover={reduce ? undefined : { y: -3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: easeOutSoft }}
    >
      {celebrate ? (
        <ConfettiBurst celebrationKey={`weekly-winner-gw-${gameweek}`} />
      ) : null}
      <Card className="h-full transition-shadow hover:shadow-md hover:shadow-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle>GW {gameweek}</CardTitle>
            <Trophy className="size-4 text-primary" />
          </div>
          <CardDescription>
            {winnerNames.length > 1 ? "Joint winners" : "Winner"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="font-semibold">{winnerNames.join(" · ") || "—"}</p>
          <p className="text-sm text-muted-foreground">
            <AnimatedNumber value={winnerPoints} /> points
            {splitLabel ? ` · ${splitLabel}` : ""}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
