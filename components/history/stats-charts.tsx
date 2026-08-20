"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type BarDatum = {
  id: string | number;
  label: string;
  value: number;
  hint?: string;
};

export function HorizontalBarChart({
  data,
  maxBars = 12,
  valueSuffix = "",
  barClassName = "bg-primary",
  emptyLabel = "No data yet",
}: {
  data: BarDatum[];
  maxBars?: number;
  valueSuffix?: string;
  barClassName?: string;
  emptyLabel?: string;
}) {
  const reduce = useReducedMotion();
  const rows = data.slice(0, maxBars);
  const max = Math.max(1, ...rows.map((d) => d.value));

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {rows.map((row, index) => {
        const pct = Math.max(4, (row.value / max) * 100);
        return (
          <li key={row.id} className="grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 sm:grid-cols-[9rem_1fr_auto]">
            <span className="truncate text-xs font-medium sm:text-sm" title={row.label}>
              {row.label}
            </span>
            <div className="h-3 overflow-hidden rounded-full bg-muted/70 sm:h-3.5">
              <motion.div
                className={cn("h-full rounded-full", barClassName)}
                initial={reduce ? false : { width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{
                  duration: 0.55,
                  delay: index * 0.04,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </div>
            <span className="w-10 text-right text-xs font-semibold tabular-nums text-muted-foreground sm:w-12 sm:text-sm">
              {row.value}
              {valueSuffix}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Simple vertical bars for season-over-season wins for one manager. */
export function SeasonSparkBars({
  values,
  className,
}: {
  values: Array<{ label: string; wins: number }>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...values.map((v) => v.wins));

  return (
    <div className={cn("flex h-16 items-end gap-1", className)}>
      {values.map((v, i) => {
        const h = Math.max(6, Math.round((v.wins / max) * 52));
        return (
          <div key={v.label} className="flex flex-1 flex-col items-center gap-1">
            <motion.div
              className="w-full max-w-6 rounded-t-sm bg-primary/80"
              initial={reduce ? false : { height: 0 }}
              animate={{ height: h }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              title={`${v.label}: ${v.wins}`}
            />
            <span className="max-w-full truncate text-[9px] text-muted-foreground">
              {v.label.replace(/^20/, "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
