"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export function NemesisTimelineChart({
  points,
  myName,
  theirName,
}: {
  points: Array<{
    gameweek: number;
    rankEdge: number;
    myRank: number;
    theirRank: number;
  }>;
  myName: string;
  theirName: string;
}) {
  const reduce = useReducedMotion();
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Not enough shared gameweeks yet.
      </p>
    );
  }

  const width = 640;
  const height = 180;
  const padX = 28;
  const padY = 24;
  const maxAbs = Math.max(3, ...points.map((p) => Math.abs(p.rankEdge)));
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  function xAt(i: number) {
    if (points.length === 1) return padX + innerW / 2;
    return padX + (i / (points.length - 1)) * innerW;
  }

  function yAt(edge: number) {
    // positive edge (I'm ahead) → upper half
    const t = edge / maxAbs;
    return padY + innerH / 2 - t * (innerH / 2);
  }

  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(p.rankEdge).toFixed(1)}`)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>{myName} ahead ↑</span>
        <span>{theirName} ahead ↓</span>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border/50 bg-muted/20 p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-44 w-full min-w-[320px]"
          role="img"
          aria-label="Rank difference vs nemesis over the season"
        >
          <line
            x1={padX}
            x2={width - padX}
            y1={height / 2}
            y2={height / 2}
            stroke="currentColor"
            className="text-border"
            strokeDasharray="4 4"
          />
          <motion.path
            d={path}
            fill="none"
            stroke="oklch(0.55 0.14 165)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, ease: "easeOut" }}
          />
          {points.map((p, i) => (
            <motion.circle
              key={p.gameweek}
              cx={xAt(i)}
              cy={yAt(p.rankEdge)}
              r={3.5}
              className={cn(
                p.rankEdge > 0
                  ? "fill-emerald-500"
                  : p.rankEdge < 0
                    ? "fill-rose-400"
                    : "fill-muted-foreground",
              )}
              initial={reduce ? false : { scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.05 * i }}
            >
              <title>
                GW{p.gameweek}: you #{p.myRank} vs #{p.theirRank}
              </title>
            </motion.circle>
          ))}
          {points.map((p, i) =>
            i % Math.ceil(points.length / 6) === 0 || i === points.length - 1 ? (
              <text
                key={`t-${p.gameweek}`}
                x={xAt(i)}
                y={height - 6}
                textAnchor="middle"
                className="fill-muted-foreground text-[9px]"
              >
                {p.gameweek}
              </text>
            ) : null,
          )}
        </svg>
      </div>
    </div>
  );
}
