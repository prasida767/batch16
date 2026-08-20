"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Clapperboard, Play, Quote } from "lucide-react";
import { easeOutSoft } from "@/components/motion/variants";
import type { DocumentaryEpisodeView } from "@/lib/documentary";

/** Compact cinematic promo for the League dashboard. */
export function FeaturedEpisodeCard({
  episode,
}: {
  episode: DocumentaryEpisodeView;
}) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOutSoft }}
    >
      <Link
        href="/documentary"
        className="group relative block overflow-hidden rounded-2xl border border-white/10 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)] ring-1 ring-black/5 dark:ring-white/10"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative min-h-[160px] overflow-hidden bg-[radial-gradient(ellipse_at_15%_0%,#1a2e24,#0a0f0c_55%,#050807)] px-5 py-6 text-white sm:min-h-[180px] sm:px-8 sm:py-7">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.15] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <motion.div
            aria-hidden
            className="pointer-events-none absolute -top-16 right-0 size-48 rounded-full bg-amber-400/20 blur-3xl"
            animate={{
              opacity: hovered ? 0.55 : 0.3,
              scale: hovered ? 1.15 : 1,
            }}
            transition={{ duration: 0.4 }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-emerald-500/10" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl space-y-2.5">
              <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.2em] text-amber-200/90 uppercase">
                <Clapperboard className="size-3" />
                {episode.kind === "finale"
                  ? "Season Finale"
                  : `Now playing · GW${episode.gameweek}`}
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-balance sm:text-3xl">
                {episode.title}
              </h2>
              {episode.quote ? (
                <p className="flex gap-2 text-sm leading-relaxed text-white/70">
                  <Quote className="mt-0.5 size-3.5 shrink-0 text-amber-300/80" />
                  <span className="line-clamp-2">“{episode.quote.body}”</span>
                </p>
              ) : (
                <p className="line-clamp-2 text-sm text-white/65">
                  {episode.biggestShock}
                </p>
              )}
            </div>
            <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-white">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-white text-black transition group-hover:scale-105">
                <Play className="size-3.5 fill-black" />
              </span>
              Watch
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
