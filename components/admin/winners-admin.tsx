"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles, Trophy } from "lucide-react";
import {
  clearWeeklyWinners,
  saveWeeklyWinners,
} from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { WeeklyGameweek } from "@/lib/league/types";

type EventOption = {
  id: number;
  name: string;
  finished: boolean;
  isCurrent: boolean;
};

export function WinnersAdmin({
  events,
  selected,
  week,
  syncedEntryIds = [],
}: {
  events: EventOption[];
  selected: number;
  week: WeeklyGameweek;
  /** FPL entry IDs that exist in the local managers table. */
  syncedEntryIds?: number[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [winnerIds, setWinnerIds] = useState<Set<number>>(
    () => new Set(week.winnerEntryIds),
  );

  const synced = useMemo(() => new Set(syncedEntryIds), [syncedEntryIds]);
  const missingEntries = useMemo(
    () => week.rows.filter((row) => !synced.has(row.entryId)),
    [week.rows, synced],
  );

  const winnerKey = week.winnerEntryIds.slice().sort((a, b) => a - b).join(",");

  useEffect(() => {
    setWinnerIds(new Set(week.winnerEntryIds));
  }, [week.gameweek, week.manuallySet, winnerKey, week.winnerEntryIds]);

  const topScore = week.rows[0]?.points ?? 0;

  const rowsJson = useMemo(
    () =>
      JSON.stringify(
        week.rows.map((row) => ({
          entryId: row.entryId,
          points: row.points,
          rank: row.rank,
        })),
      ),
    [week.rows],
  );

  function toggle(entryId: number) {
    setWinnerIds((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else next.add(entryId);
      return next;
    });
  }

  function suggestFromScores() {
    if (topScore <= 0) return;
    setWinnerIds(
      new Set(
        week.rows
          .filter((row) => row.points === topScore)
          .map((row) => row.entryId),
      ),
    );
  }

  function onGwChange(value: string) {
    const gw = Number(value);
    router.push(`/admin/winners?gw=${gw}`);
  }

  function submitSave() {
    const formData = new FormData();
    formData.set("gameweek", String(week.gameweek));
    formData.set("rowsJson", rowsJson);
    for (const id of winnerIds) {
      formData.append("winnerEntryId", String(id));
    }
    startTransition(async () => {
      const result = await saveWeeklyWinners(formData);
      setFlash(result);
      if (result.ok) router.refresh();
    });
  }

  function submitClear() {
    if (
      !window.confirm(
        `Clear manual results for GW ${week.gameweek} and fall back to FPL auto-winners?`,
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("gameweek", String(week.gameweek));
    startTransition(async () => {
      const result = await clearWeeklyWinners(formData);
      setFlash(result);
      if (result.ok) {
        setWinnerIds(new Set());
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mark weekly winners</CardTitle>
          <CardDescription>
            Override FPL auto-detection for ties, delays, or disputes. Saving
            also recalculates balances.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="gameweek">Gameweek</Label>
            <select
              id="gameweek"
              className="flex h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
              value={selected}
              onChange={(event) => onGwChange(event.target.value)}
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                  {event.finished ? "" : event.isCurrent ? " (current)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {week.manuallySet ? (
              <Badge variant="secondary">Manual override saved</Badge>
            ) : (
              <Badge variant="outline">Using FPL auto winners</Badge>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={suggestFromScores}
              disabled={pending || topScore <= 0}
            >
              <Sparkles className="size-3.5" data-icon="inline-start" />
              Suggest top score ({topScore})
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>GW {week.gameweek} scores</CardTitle>
          <CardDescription>
            Tick one or more managers for joint winners.
            {missingEntries.length > 0 ? (
              <>
                {" "}
                <span className="text-amber-700 dark:text-amber-300">
                  {missingEntries.length} FPL manager
                  {missingEntries.length === 1 ? "" : "s"} not synced — sync from
                  Admin → Managers to include them.
                </span>
              </>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {week.rows.map((row) => {
            const checked = winnerIds.has(row.entryId);
            const inDb = synced.has(row.entryId);
            return (
              <label
                key={row.entryId}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors",
                  checked
                    ? "border-primary/40 bg-primary/8"
                    : "border-border/70 hover:bg-muted/40",
                  !inDb && "opacity-70",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--primary)]"
                  checked={checked}
                  disabled={!inDb}
                  onChange={() => toggle(row.entryId)}
                />
                <span className="w-6 text-sm tabular-nums text-muted-foreground">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{row.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {row.teamName}
                    {!inDb ? ` · Entry ${row.entryId} not in DB` : ""}
                  </span>
                </span>
                <span className="font-semibold tabular-nums">{row.points}</span>
                {checked ? <Trophy className="size-4 text-primary" /> : null}
              </label>
            );
          })}
        </CardContent>
      </Card>

      {flash ? (
        <p
          className={cn(
            "text-sm",
            flash.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive",
          )}
        >
          {flash.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          disabled={pending}
          onClick={submitSave}
          className="sm:flex-1"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" data-icon="inline-start" />
          ) : (
            <Trophy className="size-4" data-icon="inline-start" />
          )}
          Save winners & recalculate
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending || !week.manuallySet}
          onClick={submitClear}
        >
          Clear override
        </Button>
      </div>
    </div>
  );
}
