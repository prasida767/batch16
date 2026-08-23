"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Flame, Heart, Skull, Swords } from "lucide-react";
import {
  RivalryCard,
  RivalryHeatmap,
} from "@/components/rivalries/heatmap";
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

function firstName(name: string) {
  const part = name.trim().split(/\s+/)[0];
  return part || name || "Unknown";
}

function counterpart(
  pair: NonNullable<RivalriesBoard["pairs"][number]>,
  entryId: number,
) {
  return pair.a.entryId === entryId ? pair.b : pair.a;
}

export function RivalriesBoardView({ board }: { board: RivalriesBoard }) {
  const [focusId, setFocusId] = useState(board.managers[0]?.entryId ?? 0);

  const profile = board.profiles[focusId] ?? null;
  const timeline = useMemo(() => {
    if (!profile) return [];
    return nemesisTimeline(profile, focusId);
  }, [profile, focusId]);

  const focus = board.managers.find((m) => m.entryId === focusId);
  const nemesisOther =
    profile?.nemesis == null ? null : counterpart(profile.nemesis, focusId);
  const charmOther =
    profile?.luckyCharm == null ? null : counterpart(profile.luckyCharm, focusId);

  return (
    <div className="space-y-8">
      <FadeIn>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {board.toxic ? (
            <HighlightChip
              icon={<Flame className="size-3.5 text-rose-500" />}
              label="Most toxic"
              value={`${firstName(board.toxic.a.displayName)} vs ${firstName(board.toxic.b.displayName)}`}
            />
          ) : null}
          {board.comeback ? (
            <HighlightChip
              icon={<Swords className="size-3.5 text-amber-500" />}
              label="Biggest comeback"
              value={firstName(board.comeback.a.displayName)}
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
            <CardTitle className="text-base">Nemesis & lucky charm</CardTitle>
            <CardDescription>
              Pick a manager — see who owns them, who they own, and the rank
              gap vs their nemesis week to week.
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

            <div className="grid gap-3 sm:grid-cols-2">
              {focus && profile?.nemesis && nemesisOther ? (
                <RivalryCard
                  title="Nemesis"
                  subtitle={`${focus.displayName} trails ${nemesisOther.displayName} across finished gameweeks.`}
                  a={focus}
                  b={nemesisOther}
                  aWins={
                    profile.nemesis.a.entryId === focusId
                      ? profile.nemesis.record.aWins
                      : profile.nemesis.record.bWins
                  }
                  bWins={
                    profile.nemesis.a.entryId === focusId
                      ? profile.nemesis.record.bWins
                      : profile.nemesis.record.aWins
                  }
                  games={profile.nemesis.record.games}
                  highlight
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  No clear nemesis yet — need a losing head-to-head record.
                </p>
              )}
              {focus && profile?.luckyCharm && charmOther ? (
                <RivalryCard
                  title="Lucky charm"
                  subtitle={`${focus.displayName} owns ${charmOther.displayName} when it counts.`}
                  a={focus}
                  b={charmOther}
                  aWins={
                    profile.luckyCharm.a.entryId === focusId
                      ? profile.luckyCharm.record.aWins
                      : profile.luckyCharm.record.bWins
                  }
                  bWins={
                    profile.luckyCharm.a.entryId === focusId
                      ? profile.luckyCharm.record.bWins
                      : profile.luckyCharm.record.aWins
                  }
                  games={profile.luckyCharm.record.games}
                />
              ) : (
                <p className="rounded-2xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                  No lucky charm yet — need a winning head-to-head record.
                </p>
              )}
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
                  myName={firstName(focus.displayName)}
                  theirName={firstName(nemesisOther.displayName)}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight">
            League scrapbook
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {board.pairs.length === 0 ? (
              <p className="text-sm text-muted-foreground sm:col-span-2 lg:col-span-3">
                The scrapbook fills in as finished gameweeks land.
              </p>
            ) : null}
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
