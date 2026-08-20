"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { completeSeasonRecapAction } from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { easeOutSoft } from "@/components/motion/variants";
import { recapLocalStorageKey } from "@/lib/onboarding/recap-keys";
import type { SeasonRecapPayload } from "@/lib/onboarding/types";
import { cn } from "@/lib/utils";

type SceneId =
  | "black"
  | "title"
  | "intro"
  | "winner"
  | "margin"
  | "highest"
  | "moments"
  | "you"
  | "welcome";

const SCENE_MS: Record<SceneId, number> = {
  black: 900,
  title: 3200,
  intro: 2800,
  winner: 4200,
  margin: 3800,
  highest: 3600,
  moments: 4500,
  you: 4200,
  welcome: 0, // waits for CTA
};

function Grain() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 opacity-[0.12] mix-blend-overlay"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  );
}

function Scanlines() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 opacity-[0.06]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.45) 2px, rgba(0,0,0,0.45) 3px)",
      }}
    />
  );
}

function BeatLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold tracking-[0.35em] text-amber-200/70 uppercase">
      {children}
    </p>
  );
}

export function SeasonRecapExperience({
  payload,
  nextPath,
}: {
  payload: SeasonRecapPayload;
  nextPath: string;
}) {
  const reduce = useReducedMotion();
  const scenes = useMemo(() => {
    const list: SceneId[] = ["black", "title", "intro", "winner", "margin"];
    if (payload.highestGw) list.push("highest");
    if (payload.moments.length > 0) list.push("moments");
    list.push("you", "welcome");
    return list;
  }, [payload.highestGw, payload.moments.length]);

  const [index, setIndex] = useState(0);
  const [momentIndex, setMomentIndex] = useState(0);
  const scene = scenes[index] ?? "welcome";

  useEffect(() => {
    try {
      window.localStorage.setItem(
        recapLocalStorageKey(payload.seasonLabel, payload.viewerManagerId),
        "1",
      );
    } catch {
      // ignore
    }
  }, [payload.seasonLabel, payload.viewerManagerId]);

  useEffect(() => {
    if (scene === "welcome") return;
    const ms = reduce ? Math.min(SCENE_MS[scene], 1200) : SCENE_MS[scene];
    if (ms <= 0) return;
    const t = window.setTimeout(() => {
      setIndex((i) => Math.min(i + 1, scenes.length - 1));
    }, ms);
    return () => window.clearTimeout(t);
  }, [scene, scenes.length, reduce]);

  useEffect(() => {
    if (scene !== "moments" || payload.moments.length <= 1 || reduce) return;
    const t = window.setInterval(() => {
      setMomentIndex((i) => (i + 1) % payload.moments.length);
    }, 2200);
    return () => window.clearInterval(t);
  }, [scene, payload.moments.length, reduce]);

  function advance() {
    setIndex((i) => Math.min(i + 1, scenes.length - 1));
  }

  const progress = ((index + 1) / scenes.length) * 100;
  const moment = payload.moments[momentIndex] ?? payload.moments[0];

  return (
    <div className="fixed inset-0 z-[80] overflow-hidden bg-[#050403] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,#3a2418_0%,#120e0b_45%,#050403_100%)]" />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl"
        animate={reduce ? undefined : { opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <Grain />
      <Scanlines />

      {/* Progress */}
      <div className="absolute top-0 right-0 left-0 z-40 h-0.5 bg-white/10">
        <motion.div
          className="h-full bg-gradient-to-r from-amber-500 to-emerald-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: easeOutSoft }}
        />
      </div>

      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        {scene !== "welcome" ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-white/55 hover:bg-white/10 hover:text-white"
            onClick={advance}
          >
            Next
          </Button>
        ) : null}
        <form action={completeSeasonRecapAction}>
          <input type="hidden" name="seasonLabel" value={payload.seasonLabel} />
          <input type="hidden" name="next" value={nextPath} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-white/55 hover:bg-white/10 hover:text-white"
          >
            Skip
          </Button>
        </form>
      </div>

      <div className="relative z-30 flex h-full items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {scene === "black" ? (
            <motion.div
              key="black"
              className="h-8 w-8 rounded-full bg-white/10"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1, 1.2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85 }}
            />
          ) : null}

          {scene === "title" ? (
            <motion.div
              key="title"
              className="max-w-3xl text-center"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.7, ease: easeOutSoft }}
            >
              <BeatLabel>Batch 16 Original</BeatLabel>
              <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight sm:text-6xl md:text-7xl">
                {payload.seasonName}
              </h1>
              <p className="mt-4 text-sm tracking-[0.25em] text-white/45 uppercase">
                A season worth roasting
              </p>
            </motion.div>
          ) : null}

          {scene === "intro" ? (
            <motion.div
              key="intro"
              className="max-w-2xl text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            >
              <BeatLabel>Previously on Batch 16</BeatLabel>
              <p className="mt-6 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-5xl">
                Last season…
              </p>
              <p className="mt-4 text-base text-white/55 sm:text-lg">
                Before you walk into {payload.currentSeasonLabel}, a quick
                documentary cut of what you survived.
              </p>
            </motion.div>
          ) : null}

          {scene === "winner" ? (
            <motion.div
              key="winner"
              className="max-w-3xl text-center"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.65, ease: easeOutSoft }}
            >
              <BeatLabel>Overall Winner</BeatLabel>
              <motion.p
                className="mt-5 font-[family-name:var(--font-display)] text-4xl font-semibold text-amber-200 sm:text-6xl"
                initial={reduce ? false : { letterSpacing: "0.08em" }}
                animate={{ letterSpacing: "0.02em" }}
                transition={{ duration: 1.2 }}
              >
                {payload.champion?.name ?? "Unknown champion"}
              </motion.p>
              <p className="mt-4 text-sm text-white/50 sm:text-base">
                The table finally stopped moving. Someone had to win.
              </p>
            </motion.div>
          ) : null}

          {scene === "margin" ? (
            <motion.div
              key="margin"
              className="max-w-2xl text-center"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55 }}
            >
              <BeatLabel>The gap</BeatLabel>
              {payload.runnerUp ? (
                <p className="mt-4 text-lg text-white/70">
                  Runner-up{" "}
                  <span className="font-semibold text-white">
                    {payload.runnerUp.name}
                  </span>
                </p>
              ) : null}
              <p className="mt-5 font-[family-name:var(--font-display)] text-2xl leading-snug text-amber-50/95 sm:text-3xl">
                {payload.winningMarginLine}
              </p>
            </motion.div>
          ) : null}

          {scene === "highest" && payload.highestGw ? (
            <motion.div
              key="highest"
              className="max-w-2xl text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <BeatLabel>Highest Gameweek</BeatLabel>
              <p className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-5xl">
                {payload.highestGw.managerName}
              </p>
              {payload.highestGw.points != null ? (
                <p className="mt-3 text-4xl font-bold tabular-nums text-emerald-300">
                  {payload.highestGw.points}
                  <span className="ml-2 text-base font-medium text-white/45">
                    pts
                    {payload.highestGw.gameweek != null
                      ? ` · GW${payload.highestGw.gameweek}`
                      : ""}
                  </span>
                </p>
              ) : null}
              <p className="mt-5 text-base text-white/55">
                {payload.highestGw.line}
              </p>
            </motion.div>
          ) : null}

          {scene === "moments" && moment ? (
            <motion.div
              key={`moment-${moment.id}-${momentIndex}`}
              className="max-w-2xl text-center"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.45 }}
            >
              <BeatLabel>{moment.eyebrow}</BeatLabel>
              <p
                className={cn(
                  "mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-4xl",
                  moment.tone === "gold" && "text-amber-200",
                  moment.tone === "ember" && "text-orange-200",
                  moment.tone === "ice" && "text-sky-200",
                  moment.tone === "poison" && "text-lime-200",
                )}
              >
                {moment.headline}
              </p>
              <p className="mt-4 text-base leading-relaxed text-white/55">
                {moment.body}
              </p>
            </motion.div>
          ) : null}

          {scene === "you" ? (
            <motion.div
              key="you"
              className="max-w-2xl text-center"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <BeatLabel>And you</BeatLabel>
              <p className="mt-5 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-5xl">
                {payload.viewerStory.headline}
              </p>
              <p className="mt-4 text-base leading-relaxed text-white/60 sm:text-lg">
                {payload.viewerStory.roast}
              </p>
              {payload.viewerStory.played &&
              payload.viewerStory.weeklyWins > 0 ? (
                <p className="mt-6 text-sm tracking-wide text-emerald-300/80 uppercase">
                  {payload.viewerStory.weeklyWins} weekly win
                  {payload.viewerStory.weeklyWins === 1 ? "" : "s"} on the board
                </p>
              ) : null}
            </motion.div>
          ) : null}

          {scene === "welcome" ? (
            <motion.div
              key="welcome"
              className="flex max-w-xl flex-col items-center text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.65, ease: easeOutSoft }}
            >
              <BeatLabel>Now streaming</BeatLabel>
              <h2 className="mt-4 font-[family-name:var(--font-display)] text-3xl font-semibold sm:text-5xl">
                {payload.welcomeLine}
              </h2>
              <p className="mt-3 text-lg text-amber-100/80">
                Good luck this season, {payload.viewerName.split(" ")[0]}.
              </p>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/50">
                {payload.cliffhanger}
              </p>
              <form action={completeSeasonRecapAction} className="mt-10">
                <input
                  type="hidden"
                  name="seasonLabel"
                  value={payload.seasonLabel}
                />
                <input type="hidden" name="next" value={nextPath} />
                <Button
                  type="submit"
                  size="lg"
                  className="min-w-[12rem] bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                >
                  Enter the league
                </Button>
              </form>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <p className="pointer-events-none absolute bottom-5 left-1/2 z-30 -translate-x-1/2 text-[10px] tracking-[0.3em] text-white/25 uppercase">
        Season Recap · {payload.seasonLabel}
      </p>
    </div>
  );
}
