"use client";

import { TrendingDown, TrendingUp, Trophy } from "lucide-react";
import {
  HorizontalBarChart,
  SeasonSparkBars,
} from "@/components/history/stats-charts";
import { FadeIn } from "@/components/motion/page-transition";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PastSeasonsStats } from "@/lib/history/queries";

export function PastSeasonsStatsBoard({ stats }: { stats: PastSeasonsStats }) {
  return (
    <div className="space-y-6">
      <FadeIn>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Aggregated across {stats.seasons.length} imported season
          {stats.seasons.length === 1 ? "" : "s"} — weekly wins, titles, and who
          climbed or slipped over time. Live league managers are separate from
          this archive.
        </p>
      </FadeIn>

      <div className="grid gap-4 lg:grid-cols-2">
        <FadeIn delay={0.04}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-amber-500" />
                Most weekly wins (all-time)
              </CardTitle>
              <CardDescription>
                Total gameweek wins across every imported season.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={stats.byWeeklyWins.map((row) => ({
                  id: row.managerId,
                  label: row.managerName,
                  value: row.weeklyWins,
                  hint: `${row.titles} title${row.titles === 1 ? "" : "s"}`,
                }))}
                barClassName="bg-emerald-500"
              />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.06}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Overall success score</CardTitle>
              <CardDescription>
                Weighted mix of titles (×10), runner-ups (×4), and weekly wins.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={stats.mostSuccessful.map((row) => ({
                  id: row.managerId,
                  label: row.managerName,
                  value: row.titles * 10 + row.runnerUps * 4 + row.weeklyWins,
                }))}
                barClassName="bg-amber-500"
              />
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.08}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-4 text-emerald-600" />
                Most improved
              </CardTitle>
              <CardDescription>
                Biggest rise in weekly wins from their first season to their
                latest (need 2+ seasons).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.mostImproved.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Need at least two seasons of data to measure improvement.
                </p>
              ) : (
                stats.mostImproved.slice(0, 6).map((row) => (
                  <div
                    key={row.managerId}
                    className="rounded-xl border border-border/60 px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="font-medium">{row.managerName}</p>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        +{row.improvement} wins
                      </p>
                    </div>
                    <SeasonSparkBars values={row.winsBySeason} />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.firstSeasonWins} → {row.lastSeasonWins} weekly wins
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="size-4 text-rose-500" />
                Most faltered
              </CardTitle>
              <CardDescription>
                Biggest drop in weekly wins from first season to latest.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.mostFaltered.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No clear drop-offs yet — or only one season imported.
                </p>
              ) : (
                stats.mostFaltered.slice(0, 6).map((row) => (
                  <div
                    key={row.managerId}
                    className="rounded-xl border border-border/60 px-3 py-2.5"
                  >
                    <div className="mb-2 flex items-baseline justify-between gap-2">
                      <p className="font-medium">{row.managerName}</p>
                      <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
                        {row.improvement} wins
                      </p>
                    </div>
                    <SeasonSparkBars values={row.winsBySeason} />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {row.firstSeasonWins} → {row.lastSeasonWins} weekly wins
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {stats.titles.length > 0 ? (
        <FadeIn delay={0.12}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Season champions</CardTitle>
              <CardDescription>
                Overall 1st finishes across imported seasons.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart
                data={stats.titles.map((row) => ({
                  id: row.managerId,
                  label: row.managerName,
                  value: row.titles,
                }))}
                maxBars={8}
                valueSuffix={""}
                barClassName="bg-sky-500"
              />
            </CardContent>
          </Card>
        </FadeIn>
      ) : null}
    </div>
  );
}
