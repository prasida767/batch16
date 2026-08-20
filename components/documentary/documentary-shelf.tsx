"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Clapperboard,
  Film,
  Play,
  Quote,
  Shirt,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { EpisodeRating } from "@/components/documentary/episode-rating";
import { Button } from "@/components/ui/button";
import { easeOutSoft } from "@/components/motion/variants";
import type { DocumentaryEpisodeView } from "@/lib/documentary";
import type { QuoteOfWeek } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

/** Per-episode palette — dark cinematic cards that work on light & dark pages. */
function episodePalette(seed: number) {
  const palettes = [
    {
      base: "from-[#0c1410] via-[#12261c] to-[#0a1f18]",
      glow: "bg-emerald-500/25",
      accent: "text-emerald-300",
      ring: "ring-emerald-400/25",
    },
    {
      base: "from-[#120e0a] via-[#2a1a0c] to-[#1a1208]",
      glow: "bg-amber-500/20",
      accent: "text-amber-300",
      ring: "ring-amber-400/25",
    },
    {
      base: "from-[#0a1018] via-[#132030] to-[#0c1824]",
      glow: "bg-sky-500/20",
      accent: "text-sky-300",
      ring: "ring-sky-400/25",
    },
    {
      base: "from-[#140a0c] via-[#2a1218] to-[#1a0c10]",
      glow: "bg-rose-500/20",
      accent: "text-rose-300",
      ring: "ring-rose-400/25",
    },
  ];
  return palettes[Math.abs(seed) % palettes.length]!;
}

function EpisodeBadge({
  episode,
  large,
}: {
  episode: DocumentaryEpisodeView;
  large?: boolean;
}) {
  if (episode.kind === "finale") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/15 font-semibold tracking-[0.14em] text-amber-200 uppercase backdrop-blur-sm",
          large ? "px-3 py-1 text-[11px]" : "px-2.5 py-0.5 text-[10px]",
        )}
      >
        <Sparkles className={large ? "size-3.5" : "size-3"} />
        Season Finale
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/35 font-semibold tracking-[0.14em] text-white/90 uppercase backdrop-blur-sm",
        large ? "px-3 py-1 text-[11px]" : "px-2.5 py-0.5 text-[10px]",
      )}
    >
      <Film className={large ? "size-3.5" : "size-3"} />
      Ep. {episode.gameweek}
      <span className="text-white/45">·</span>
      GW{episode.gameweek}
    </span>
  );
}

function SectionLabel({
  children,
  accent,
}: {
  children: React.ReactNode;
  accent?: "amber" | "default";
}) {
  return (
    <div className="flex items-center gap-3">
      <h2
        className={cn(
          "font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.22em] uppercase sm:text-sm",
          accent === "amber"
            ? "text-amber-700 dark:text-amber-400"
            : "text-foreground",
        )}
      >
        {children}
      </h2>
      <div
        className={cn(
          "h-px flex-1",
          accent === "amber"
            ? "bg-gradient-to-r from-amber-500/40 to-transparent"
            : "bg-gradient-to-r from-foreground/20 to-transparent",
        )}
      />
    </div>
  );
}

function EpisodeDetail({
  episode,
  canRate,
  onClose,
}: {
  episode: DocumentaryEpisodeView;
  canRate: boolean;
  onClose: () => void;
}) {
  const palette = episodePalette(episode.gameweek ?? episode.id);
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={onClose}
    >
      <motion.article
        initial={reduce ? false : { opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.98 }}
        transition={{ duration: 0.32, ease: easeOutSoft }}
        className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-card text-card-foreground shadow-[0_25px_80px_-12px_rgba(0,0,0,0.55)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            "relative overflow-hidden bg-gradient-to-br px-6 pt-8 pb-10 text-white sm:px-8",
            palette.base,
          )}
        >
          <div
            className={cn(
              "pointer-events-none absolute -top-16 -right-10 size-56 rounded-full blur-3xl",
              palette.glow,
            )}
          />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
            }}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="absolute top-4 right-4 text-white/70 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
          <EpisodeBadge episode={episode} large />
          <h2 className="mt-4 max-w-xl font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-balance sm:text-4xl">
            {episode.title}
          </h2>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <Beat label="Biggest Shock" body={episode.biggestShock} />
          <Beat label="Worst Decision of the Week" body={episode.worstDecision} />
          <Beat label="Most Dramatic Overtake" body={episode.dramaticOvertake} />

          {episode.quote ? (
            <blockquote className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent px-5 py-4">
              <Quote className="absolute top-3 right-3 size-8 text-amber-500/20" />
              <p className="mb-2 text-[11px] font-semibold tracking-[0.16em] text-amber-700 uppercase dark:text-amber-400">
                Quote of the Week
              </p>
              <p className="text-lg leading-snug font-semibold text-foreground">
                “{episode.quote.body}”
              </p>
              <footer className="mt-2 text-sm text-muted-foreground">
                — {episode.quote.managerName}
                {episode.quote.reactionCount > 0
                  ? ` · ${episode.quote.reactionCount} reactions`
                  : null}
              </footer>
            </blockquote>
          ) : (
            <p className="text-sm text-muted-foreground">
              No Dressing Room quote crowned for this week.
            </p>
          )}

          {episode.finaleSummary ? (
            <Beat label="Season Arc" body={episode.finaleSummary} />
          ) : null}

          <div className="rounded-2xl border border-border/80 bg-muted/50 px-5 py-4">
            <p className="mb-1.5 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
              Next time
            </p>
            <p className="text-base leading-relaxed text-foreground italic">
              {episode.cliffhanger}
            </p>
          </div>

          <EpisodeRating
            episodeId={episode.id}
            initialMyRating={episode.myRating}
            ratingAverage={episode.ratingAverage}
            ratingCount={episode.ratingCount}
            canRate={canRate}
          />
        </div>
      </motion.article>
    </motion.div>
  );
}

function Beat({ label, body }: { label: string; body: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="text-[15px] leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function EpisodeCard({
  episode,
  featured,
  onOpen,
  index = 0,
}: {
  episode: DocumentaryEpisodeView;
  featured?: boolean;
  onOpen: () => void;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const palette = episodePalette(episode.gameweek ?? episode.id);

  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.06, 0.4),
        duration: 0.45,
        ease: easeOutSoft,
      }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.01 }}
      whileTap={reduce ? undefined : { scale: 0.99 }}
      className={cn(
        "group relative flex w-full flex-col justify-end overflow-hidden text-left",
        "rounded-2xl ring-1 ring-black/10 dark:ring-white/10",
        "shadow-[0_8px_30px_-8px_rgba(0,0,0,0.45)] transition-shadow duration-300",
        "hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.55)] hover:ring-2",
        palette.ring,
        "bg-gradient-to-br",
        palette.base,
        featured
          ? "min-h-[240px] aspect-[16/9] sm:min-h-[300px] sm:aspect-[2.35/1]"
          : "aspect-[16/11] min-h-[180px]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -top-20 right-0 size-64 rounded-full blur-3xl transition-opacity duration-500",
          palette.glow,
          "opacity-40 group-hover:opacity-70",
        )}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.14] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Soft light streak */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/[0.07] to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

      {/* Play affordance */}
      <div className="absolute top-1/2 left-1/2 z-20 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-black/40 opacity-0 shadow-lg backdrop-blur-md transition-all duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
        <Play className="size-5 fill-white text-white" />
      </div>

      <div
        className={cn(
          "relative z-10 space-y-2.5 p-5 sm:p-6",
          featured && "sm:max-w-2xl sm:p-8 sm:pb-9",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <EpisodeBadge episode={episode} large={featured} />
          {episode.ratingAverage != null ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-medium text-amber-200 backdrop-blur-sm">
              <Star className="size-3 fill-amber-300 text-amber-300" />
              {episode.ratingAverage.toFixed(1)}
              <span className="text-white/40">({episode.ratingCount})</span>
            </span>
          ) : null}
        </div>

        <h3
          className={cn(
            "font-[family-name:var(--font-display)] font-bold tracking-tight text-white text-balance drop-shadow-sm",
            featured
              ? "text-2xl leading-tight sm:text-4xl"
              : "text-lg leading-snug sm:text-xl",
          )}
        >
          {episode.title}
        </h3>

        {featured ? (
          <p className="line-clamp-2 max-w-xl text-sm leading-relaxed text-white/75 sm:text-base">
            {episode.quote
              ? `“${episode.quote.body}”`
              : episode.biggestShock}
          </p>
        ) : (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/65 sm:text-[13px]">
            {episode.biggestShock}
          </p>
        )}

        {featured ? (
          <span className="inline-flex items-center gap-2 pt-1 text-sm font-semibold text-white">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-white text-black">
              <Play className="size-3.5 fill-black" />
            </span>
            Watch episode
          </span>
        ) : null}
      </div>
    </motion.button>
  );
}

function DocumentaryHero({ episodeCount }: { episodeCount: number }) {
  const reduce = useReducedMotion();

  return (
    <motion.header
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: easeOutSoft }}
      className="relative isolate overflow-hidden rounded-[1.75rem] border border-white/10 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.5)]"
    >
      {/* Deep cinematic base */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,#1a2e24_0%,#0a0f0c_45%,#050807_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(16,185,129,0.12)_70%,rgba(245,158,11,0.1)_100%)]" />
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
      {/* Scanline / film bar */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 3px)",
        }}
      />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-20 size-[28rem] rounded-full bg-amber-500/15 blur-3xl"
        animate={
          reduce
            ? undefined
            : { opacity: [0.25, 0.45, 0.25], scale: [1, 1.08, 1] }
        }
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-24 size-[22rem] rounded-full bg-emerald-500/20 blur-3xl"
        animate={
          reduce
            ? undefined
            : { opacity: [0.2, 0.4, 0.2], scale: [1.05, 1, 1.05] }
        }
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative flex min-h-[320px] flex-col justify-end px-6 py-10 sm:min-h-[380px] sm:px-10 sm:py-14 lg:min-h-[420px] lg:px-14">
        <div className="max-w-3xl space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-amber-200 uppercase backdrop-blur-sm">
              <Clapperboard className="size-3.5" />
              Season Documentary
            </span>
            {episodeCount > 0 ? (
              <span className="text-xs font-medium text-white/50">
                {episodeCount} episode{episodeCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>

          <h1 className="font-[family-name:var(--font-display)] text-4xl leading-[1.05] font-bold tracking-tight text-white text-balance sm:text-5xl lg:text-6xl">
            Batch 16
            <span className="mt-1 block text-[0.85em] font-semibold text-white/85">
              The Season So Far
            </span>
          </h1>

          <p className="max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
            Shocks, collapses, and the Dressing Room lines that defined each
            gameweek — told like a sports documentary, one episode at a time.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/dressing-room"
              className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-6 text-sm font-semibold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.2),0_8px_24px_-4px_rgba(0,0,0,0.4)] transition hover:bg-emerald-50 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_12px_28px_-4px_rgba(0,0,0,0.45)]"
            >
              <Shirt className="size-4" />
              Enter The Dressing Room
            </Link>
            <span className="hidden text-sm text-white/45 sm:inline">
              Banter writes the quotes
            </span>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

export function DocumentaryShelf({
  featured,
  episodes,
  finale,
  canRate,
  liveQuote,
}: {
  featured: DocumentaryEpisodeView | null;
  episodes: DocumentaryEpisodeView[];
  finale: DocumentaryEpisodeView | null;
  canRate: boolean;
  liveQuote?: QuoteOfWeek | null;
}) {
  const [openId, setOpenId] = useState<number | null>(null);
  const open =
    [...episodes, ...(finale ? [finale] : [])].find((e) => e.id === openId) ??
    null;
  const gridEpisodes = episodes.filter((ep) => ep.id !== featured?.id);

  return (
    <div className="relative -mx-4 space-y-12 sm:-mx-6 lg:-mx-8">
      {/* Page atmosphere — soft vignette behind content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-8 h-[520px] bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.45_0.08_155_/_0.12),transparent_65%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.35_0.08_155_/_0.25),transparent_60%)]"
      />

      <div className="relative space-y-12 px-4 sm:px-6 lg:px-8">
        <DocumentaryHero episodeCount={episodes.length + (finale ? 1 : 0)} />

        {featured ? (
          <section className="space-y-4">
            <SectionLabel>Now playing</SectionLabel>
            <EpisodeCard
              episode={featured}
              featured
              index={0}
              onOpen={() => setOpenId(featured.id)}
            />
          </section>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-dashed border-border/80 bg-muted/40 px-6 py-16 text-center">
            <Film className="mx-auto mb-3 size-10 text-muted-foreground/50" />
            <p className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
              The reel is still warming up
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Episodes drop automatically when a gameweek finishes. Keep the
              Dressing Room loud — the best lines become Quote of the Week.
            </p>
          </section>
        )}

        {liveQuote ? (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, ease: easeOutSoft }}
            className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/90 via-emerald-900/80 to-teal-950/90 px-5 py-5 text-white shadow-lg sm:px-7 sm:py-6 dark:from-emerald-950/60 dark:via-emerald-900/40 dark:to-teal-950/50"
          >
            <div className="pointer-events-none absolute -top-12 right-0 size-40 rounded-full bg-emerald-400/20 blur-3xl" />
            <p className="relative mb-2 flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] text-emerald-200/90 uppercase">
              <Quote className="size-3.5" />
              Live quote contender · GW{liveQuote.gameweek}
            </p>
            <p className="relative text-lg font-semibold text-balance sm:text-xl">
              “{liveQuote.body}”
            </p>
            <p className="relative mt-2 text-sm text-emerald-100/70">
              {liveQuote.managerName} · {liveQuote.reactionCount} reactions —
              locks when the next gameweek starts
            </p>
          </motion.section>
        ) : null}

        {gridEpisodes.length > 0 ? (
          <section className="space-y-5">
            <SectionLabel>All episodes</SectionLabel>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {gridEpisodes.map((ep, i) => (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  index={i + 1}
                  onOpen={() => setOpenId(ep.id)}
                />
              ))}
            </div>
          </section>
        ) : null}

        {finale ? (
          <section className="space-y-4 pb-4">
            <SectionLabel accent="amber">Season Finale</SectionLabel>
            <EpisodeCard
              episode={finale}
              featured
              index={0}
              onOpen={() => setOpenId(finale.id)}
            />
          </section>
        ) : null}
      </div>

      <AnimatePresence>
        {open ? (
          <EpisodeDetail
            episode={open}
            canRate={canRate}
            onClose={() => setOpenId(null)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
