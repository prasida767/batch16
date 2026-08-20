"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import { Flame, Heart, Skull, Swords } from "lucide-react";
import { RivalryCard } from "@/components/rivalries/heatmap";
import { NemesisTimelineChart } from "@/components/rivalries/nemesis-timeline";
import { ManagerAvatar } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  nemesisTimeline,
  type RivalriesBoard,
} from "@/lib/rivalries/compute";

const RivalryHeatmap = dynamic(
  () =>
    import("@/components/rivalries/heatmap").then((m) => m.RivalryHeatmap),
  {
    ssr: false,
    loading: () => (
      <div className="h-72 animate-pulse rounded-2xl bg-muted/40" aria-hidden />
    ),
  },
);

export function RivalriesBoardView({ board }: { board: RivalriesBoard }) {
  const [focusId, setFocusId] = useState(board.managers[0]?.entryId ?? 0);

  const profile = board.profiles[focusId] ?? null;
  const timeline = useMemo(() => {
    if (!profile) return [];
    return nemesisTimeline(profile, focusId);
  }, [profile, focusId]);

  const focus = board.managers.find((m) => m.entryId === focusId);
  const nemesisOther =
    profile?.nemesis == null
      ? null
      : profile.nemesis.a.entryId === focusId
        ? profile.nemesis.b
        : profile.nemesis.a;

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {board.toxic ? (
            <HighlightChip
              icon={<Flame className="size-3.5 text-rose-500" />}
              label="Most toxic"
              value={`${board.toxic.a.displayName.split(" ")[0]} vs ${board.toxic.b.displayName.split(" ")[0]}`}
            />
          ) : null}
          {board.comeback ? (
            <HighlightChip
              icon={<Swords className="size-3.5 text-amber-500" />}
              label="Biggest comeback"
              value={board.comeback.a.displayName.split(" ")[0]!}
            />
          ) : null}
          <HighlightChip
            icon={<Skull className="size-3.5 text-violet-500" />}
            label="Rivalries tracked"
            value={String(board.pairs.length)}
          />
          <HighlightChip
            icon={<Heart className="size-3.5 text-emerald-500" />}
            label="Managers"
            value={String(board.managers.length)}
          />
        </div>
      </FadeIn>

      <FadeIn delay={0.04}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rivalry heatmap</CardTitle>
            <CardDescription>
              Who owns who across finished gameweeks. Colour intensity = how
              one-sided the scrap is.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RivalryHeatmap
              managers={board.managers}
              heatmap={board.heatmap}
            />
          </CardContent>
        </Card>
      </FadeIn>

      {(board.toxic || board.comeback) && (
        <FadeIn delay={0.06}>
          <div className="grid gap-4 md:grid-cols-2">
            {board.toxic ? (
              <RivalryCard
                title={board.toxic.title}
                subtitle={board.toxic.subtitle}
                a={board.toxic.a}
                b={board.toxic.b}
                aWins={board.toxic.record.aWins}
                bWins={board.toxic.record.bWins}
                games={board.toxic.record.games}
                highlight
              />
            ) : null}
            {board.comeback ? (
              <RivalryCard
                title={board.comeback.title}
                subtitle={board.comeback.subtitle}
                a={board.comeback.a}
                b={board.comeback.b}
                aWins={board.comeback.record.aWins}
                bWins={board.comeback.record.bWins}
                games={board.comeback.record.games}
                highlight
              />
            ) : null}
          </div>
        </FadeIn>
      )}

      <FadeIn delay={0.08}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nemesis timeline</CardTitle>
            <CardDescription>
              Pick a manager — see how the rank gap vs their nemesis swings week
              to week.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="focus-manager">Manager</Label>
              <select
                id="focus-manager"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={focusId}
                onChange={(e) => setFocusId(Number(e.target.value))}
              >
                {board.managers.map((m) => (
                  <option key={m.entryId} value={m.entryId}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>

            {focus && profile?.nemesis && nemesisOther ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-3">
                  <ManagerAvatar
                    name={focus.displayName}
                    supportedTeamId={focus.supportedTeamId}
                    supportedTeamCode={focus.supportedTeamCode}
                    avatarVariant={focus.avatarVariant}
                    size="sm"
                  />
                  <span className="text-sm text-muted-foreground">is haunted by</span>
                  <ManagerAvatar
                    name={nemesisOther.displayName}
                    supportedTeamId={nemesisOther.supportedTeamId}
                    supportedTeamCode={nemesisOther.supportedTeamCode}
                    avatarVariant={nemesisOther.avatarVariant}
                    size="sm"
                  />
                  <span className="font-semibold">{nemesisOther.displayName}</span>
                </div>
                <NemesisTimelineChart
                  points={timeline}
                  myName={focus.displayName.split(" ")[0]!}
                  theirName={nemesisOther.displayName.split(" ")[0]!}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No clear nemesis yet for this manager — need more finished
                gameweeks.
              </p>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            League scrapbook
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {board.pairs.slice(0, 12).map((pair) => (
              <RivalryCard
                key={pair.key}
                title={pair.title}
                subtitle={pair.subtitle}
                a={pair.a}
                b={pair.b}
                aWins={pair.record.aWins}
                bWins={pair.record.bWins}
                games={pair.record.games}
              />
            ))}
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

function HighlightChip({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-3">
      <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}
