"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  UpcomingFixtureView,
  UpcomingGameweekFixtures,
} from "@/lib/fpl";
import { cn } from "@/lib/utils";

type FixturesResponse =
  | { kind: "ok"; gameweeks: UpcomingGameweekFixtures[] }
  | { kind: "error"; message: string };

function useLocalTimezone(): string {
  return useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  }, []);
}

function formatKickoff(iso: string | null, timeZone: string): string {
  if (!iso) return "TBD";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "TBD";

  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatTimezoneLabel(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date());
    const name = parts.find((part) => part.type === "timeZoneName")?.value;
    return name ? `${timeZone.replace(/_/g, " ")} · ${name}` : timeZone;
  } catch {
    return timeZone;
  }
}

/** Fixtures for the League hub “Fixtures” tab — grouped tables. */
export function UpcomingFixtures({
  initialGameweeks = null,
}: {
  initialGameweeks?: UpcomingGameweekFixtures[] | null;
}) {
  const timeZone = useLocalTimezone();
  const [gameweeks, setGameweeks] = useState<UpcomingGameweekFixtures[] | null>(
    initialGameweeks,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(initialGameweeks == null);

  useEffect(() => {
    if (initialGameweeks != null) {
      setGameweeks(initialGameweeks);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const response = await fetch("/api/fixtures", { cache: "no-store" });
        const json = (await response.json()) as FixturesResponse;
        if (cancelled) return;
        if (json.kind === "ok") {
          setGameweeks(json.gameweeks);
          setError(null);
        } else {
          setError(json.message || "Couldn't load fixtures.");
          setGameweeks([]);
        }
      } catch {
        if (!cancelled) {
          setError("Couldn't load fixtures.");
          setGameweeks([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialGameweeks]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="size-4 text-primary" />
            Fixtures
          </CardTitle>
          <CardDescription>
            Current and next gameweek · kick-off in your local time
          </CardDescription>
        </div>
        <p className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Clock className="size-3.5" />
          {formatTimezoneLabel(timeZone)}
        </p>
      </CardHeader>
      <CardContent className="space-y-6 px-0 pb-0 sm:px-0">
        {loading ? <FixturesTableSkeleton /> : null}
        {!loading && error ? (
          <p className="px-4 pb-6 text-sm text-destructive sm:px-5" role="status">
            {error}
          </p>
        ) : null}
        {!loading && !error && gameweeks && gameweeks.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted-foreground sm:px-5">
            No fixtures available yet for the current or next gameweek.
          </p>
        ) : null}
        {!loading &&
          gameweeks?.map((group) => (
            <GameweekTable
              key={group.eventId}
              group={group}
              timeZone={timeZone}
            />
          ))}
      </CardContent>
    </Card>
  );
}

function GameweekTable({
  group,
  timeZone,
}: {
  group: UpcomingGameweekFixtures;
  timeZone: string;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-center gap-2 border-y border-border/70 bg-muted/30 px-4 py-2.5 sm:px-5">
        <h3 className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight">
          {group.name}
        </h3>
        {group.isCurrent ? (
          <Badge variant="secondary" className="text-[10px]">
            Current
          </Badge>
        ) : null}
        {group.isNext ? (
          <Badge variant="outline" className="text-[10px]">
            Next
          </Badge>
        ) : null}
        <span className="text-xs text-muted-foreground">
          {group.fixtures.length}{" "}
          {group.fixtures.length === 1 ? "fixture" : "fixtures"}
        </span>
      </div>

      {group.fixtures.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">
          No fixtures scheduled.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium sm:px-5">Kick-off</th>
                <th className="px-2 py-2.5 font-medium">Home</th>
                <th className="px-2 py-2.5 text-center font-medium"> </th>
                <th className="px-2 py-2.5 font-medium">Away</th>
                <th className="px-4 py-2.5 text-right font-medium sm:px-5">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {group.fixtures.map((fixture) => (
                <FixtureTableRow
                  key={fixture.id}
                  fixture={fixture}
                  timeZone={timeZone}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function FixtureTableRow({
  fixture,
  timeZone,
}: {
  fixture: UpcomingFixtureView;
  timeZone: string;
}) {
  const kickoff = formatKickoff(fixture.kickoffTime, timeZone);
  const showScore = fixture.started || fixture.finished;

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="px-4 py-3 align-middle text-xs font-medium whitespace-nowrap text-muted-foreground sm:px-5 sm:text-sm">
        {kickoff}
      </td>
      <td className="px-2 py-3 align-middle">
        <TeamCell team={fixture.home} side="H" />
      </td>
      <td className="px-2 py-3 text-center align-middle">
        {showScore ? (
          <span className="font-semibold tabular-nums">
            {fixture.homeScore ?? 0}
            <span className="mx-0.5 text-muted-foreground">–</span>
            {fixture.awayScore ?? 0}
          </span>
        ) : (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tracking-wider text-muted-foreground">
            VS
          </span>
        )}
      </td>
      <td className="px-2 py-3 align-middle">
        <TeamCell team={fixture.away} side="A" />
      </td>
      <td className="px-4 py-3 text-right align-middle sm:px-5">
        {fixture.finished ? (
          <Badge variant="outline" className="text-[10px]">
            FT
          </Badge>
        ) : fixture.started ? (
          <Badge
            variant="outline"
            className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-700 dark:text-emerald-300"
          >
            Live
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">Scheduled</span>
        )}
      </td>
    </tr>
  );
}

function TeamCell({
  team,
  side,
}: {
  team: UpcomingFixtureView["home"];
  side: "H" | "A";
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={team.badgeUrl}
        alt=""
        width={24}
        height={24}
        className="size-6 shrink-0 object-contain sm:size-7"
        loading="lazy"
      />
      <div className="min-w-0">
        <p className="truncate font-medium">
          <span className="sm:hidden">{team.shortName}</span>
          <span className="hidden sm:inline">{team.name}</span>
        </p>
        <span
          className={cn(
            "mt-0.5 inline-flex rounded px-1 py-px text-[9px] font-semibold tracking-wide uppercase",
            side === "H"
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground",
          )}
        >
          {side === "H" ? "Home" : "Away"}
        </span>
      </div>
    </div>
  );
}

function FixturesTableSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-6 sm:px-5" aria-hidden>
      {[0, 1].map((group) => (
        <div key={group} className="space-y-2">
          <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          <div className="space-y-2 rounded-xl border border-border/60 p-3">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center gap-3">
                <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                <div className="size-6 animate-pulse rounded-full bg-muted" />
                <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                <div className="size-6 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
