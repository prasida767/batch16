"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ManagerAvatar } from "@/components/league/shared";
import { cn } from "@/lib/utils";
import type { RivalryManager } from "@/lib/rivalries/compute";

export function RivalryHeatmap({
  managers,
  heatmap,
}: {
  managers: RivalryManager[];
  heatmap: Array<Array<number | null>>;
}) {
  const reduce = useReducedMotion();
  const n = managers.length;
  if (n === 0) return null;

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-card/40 p-3 sm:p-4">
      <div
        className="inline-grid gap-0.5"
        style={{
          gridTemplateColumns: `minmax(4.5rem,6rem) repeat(${n}, minmax(1.75rem, 2.25rem))`,
        }}
      >
        <div />
        {managers.map((m) => (
          <div
            key={`h-${m.entryId}`}
            className="flex h-14 items-end justify-center pb-1"
            title={m.displayName}
          >
            <span className="origin-bottom-left translate-y-1 -rotate-45 text-[9px] font-medium text-muted-foreground sm:text-[10px]">
              {m.displayName.split(" ")[0]}
            </span>
          </div>
        ))}

        {managers.map((rowManager, i) => (
          <div key={`r-${rowManager.entryId}`} className="contents">
            <div className="flex items-center truncate pr-2 text-[10px] font-medium sm:text-xs">
              {rowManager.displayName.split(" ")[0]}
            </div>
            {managers.map((colManager, j) => {
              const value = heatmap[i]?.[j] ?? null;
              if (i === j) {
                return (
                  <div
                    key={`${i}-${j}`}
                    className="aspect-square rounded-sm bg-muted/40"
                  />
                );
              }
              const intensity = value == null ? 0 : value;
              // Red = row dominates, blue-ish muted = row loses
              const bg =
                value == null
                  ? "transparent"
                  : intensity >= 0.5
                    ? `color-mix(in oklch, var(--primary) ${Math.round((intensity - 0.5) * 2 * 85 + 15)}%, transparent)`
                    : `color-mix(in oklch, oklch(0.65 0.15 25) ${Math.round((0.5 - intensity) * 2 * 75 + 10)}%, transparent)`;

              return (
                <motion.div
                  key={`${i}-${j}`}
                  className="aspect-square rounded-sm ring-1 ring-border/30"
                  style={{ background: bg }}
                  title={
                    value == null
                      ? `${rowManager.displayName} vs ${colManager.displayName}`
                      : `${rowManager.displayName} wins ${(intensity * 100).toFixed(0)}% vs ${colManager.displayName}`
                  }
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    delay: Math.min((i * n + j) * 0.004, 0.4),
                    duration: 0.25,
                  }}
                  whileHover={reduce ? undefined : { scale: 1.15, zIndex: 2 }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Rows vs columns: greener = that row manager dominates; warmer = they get
        owned. Hover a cell for the win rate.
      </p>
    </div>
  );
}

export function RivalryCard({
  title,
  subtitle,
  a,
  b,
  aWins,
  bWins,
  games,
  highlight,
}: {
  title: string;
  subtitle: string;
  a: RivalryManager;
  b: RivalryManager;
  aWins: number;
  bWins: number;
  games: number;
  highlight?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={cn(
        "rounded-2xl border border-border/60 bg-card/50 p-4 shadow-xs",
        highlight && "ring-1 ring-primary/30 bg-primary/5",
      )}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35 }}
    >
      <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">
        {title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <ManagerAvatar
            name={a.displayName}
            supportedTeamId={a.supportedTeamId}
            supportedTeamCode={a.supportedTeamCode}
            avatarVariant={a.avatarVariant}
            size="md"
          />
          <p className="truncate text-xs font-medium">{a.displayName}</p>
          <p className="text-lg font-bold tabular-nums">{aWins}</p>
        </div>
        <div className="shrink-0 text-center">
          <p className="font-[family-name:var(--font-display)] text-sm font-semibold text-muted-foreground">
            VS
          </p>
          <p className="text-[10px] text-muted-foreground">{games} GWs</p>
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5 text-center">
          <ManagerAvatar
            name={b.displayName}
            supportedTeamId={b.supportedTeamId}
            supportedTeamCode={b.supportedTeamCode}
            avatarVariant={b.avatarVariant}
            size="md"
          />
          <p className="truncate text-xs font-medium">{b.displayName}</p>
          <p className="text-lg font-bold tabular-nums">{bWins}</p>
        </div>
      </div>
    </motion.div>
  );
}
