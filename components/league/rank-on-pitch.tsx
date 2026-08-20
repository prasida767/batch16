"use client";

import { useMemo, useState } from "react";
import {
  VerticalPitchRank,
  type PitchRankMode,
  type VerticalPitchRow,
} from "@/components/league/vertical-pitch-rank";
import { Button } from "@/components/ui/button";
import { rankDelta } from "@/lib/league/format";
import type { ManagerStanding } from "@/lib/league/types";
import { cn } from "@/lib/utils";

function toOverallRows(rows: ManagerStanding[]): VerticalPitchRow[] {
  return rows.map((row) => ({
    entryId: row.entryId,
    name: row.displayName || row.name,
    teamName: row.teamName,
    rank: row.rank,
    lastRank: row.lastRank || row.rank,
    points: row.totalPoints,
    gwPoints: row.livePoints ?? row.eventPoints,
    avatarUrl: row.avatarUrl,
  }));
}

function toLiveRows(rows: ManagerStanding[]): VerticalPitchRow[] {
  const projected = rows.map((row) => {
    const gw = row.livePoints ?? row.eventPoints;
    const total =
      row.livePoints != null
        ? row.totalPoints - row.eventPoints + row.livePoints
        : row.totalPoints;
    return { row, gw, total };
  });
  projected.sort(
    (a, b) =>
      b.total - a.total ||
      b.gw - a.gw ||
      a.row.displayName.localeCompare(b.row.displayName),
  );
  return projected.map((item, index) => {
    const displayRank = index + 1;
    return {
      entryId: item.row.entryId,
      name: item.row.displayName || item.row.name,
      teamName: item.row.teamName,
      rank: displayRank,
      lastRank: item.row.lastRank || item.row.rank,
      points: item.total,
      gwPoints: item.gw,
      avatarUrl: item.row.avatarUrl,
    };
  });
}

/** League Pitch tab — full vertical pitch for all managers. */
export function RankOnPitch({
  rows,
  live = false,
  provisional = false,
  highlightEntryId = null,
}: {
  rows: ManagerStanding[];
  live?: boolean;
  provisional?: boolean;
  highlightEntryId?: number | null;
}) {
  const canLive = live || provisional;
  const [mode, setMode] = useState<PitchRankMode>(canLive ? "live" : "overall");

  const pitchRows = useMemo(() => {
    const activeMode = canLive ? mode : "overall";
    return activeMode === "live" ? toLiveRows(rows) : toOverallRows(rows);
  }, [rows, mode, canLive]);

  const activeMode: PitchRankMode = canLive ? mode : "overall";

  return (
    <div className="space-y-3">
      {canLive ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {activeMode === "live"
              ? "Ranked by projected total (official − GW + live GW)"
              : "Ranked by official overall standings"}
          </p>
          <div className="inline-flex rounded-lg bg-muted/70 p-0.5 ring-1 ring-border/60">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(mode === "live" && "bg-card shadow-xs")}
              onClick={() => setMode("live")}
              aria-pressed={mode === "live"}
            >
              Live
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className={cn(mode === "overall" && "bg-card shadow-xs")}
              onClick={() => setMode("overall")}
              aria-pressed={mode === "overall"}
            >
              Overall
            </Button>
          </div>
        </div>
      ) : null}

      <VerticalPitchRank
        rows={pitchRows}
        mode={activeMode}
        highlightEntryId={highlightEntryId}
        showMeters={activeMode === "live"}
        label={
          activeMode === "live" ? "Live pitch race" : "Overall pitch rank"
        }
      />
    </div>
  );
}

/** @deprecated helper kept if callers need momentum from standings */
export function standingMomentum(row: ManagerStanding) {
  const d = rankDelta(row.rank, row.lastRank || row.rank);
  return d > 0 ? "rising" : d < 0 ? "falling" : "steady";
}
