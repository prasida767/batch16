import Link from "next/link";
import { BarChart3, Crown, Medal, Trophy } from "lucide-react";
import { PastSeasonsStatsBoard } from "@/components/history/past-seasons-stats";
import { ManagerAvatar, PageHeader, SetupState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getPastSeasonsData,
  getPastSeasonsStats,
  prizeTypeLabel,
} from "@/lib/history/queries";
import { formatMoney } from "@/lib/prizes";
import { cn } from "@/lib/utils";

export const revalidate = 120;

export default async function PastSeasonsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; view?: string }>;
}) {
  const { season: seasonParam, view: viewParam } = await searchParams;
  const view = viewParam === "stats" ? "stats" : "archive";

  const [result, statsResult] = await Promise.all([
    getPastSeasonsData(seasonParam),
    getPastSeasonsStats(),
  ]);

  if (result.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Archive"
          title="Past seasons"
          description="Weekly winners and final prizes from previous Batch 16 campaigns."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL in .env.local to load historical seasons."
        />
      </div>
    );
  }

  if (result.kind === "empty") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Archive"
          title="Past seasons"
          description="Weekly winners and final prizes from previous Batch 16 campaigns."
        />
        <Card>
          <CardHeader>
            <CardTitle>No historical data yet</CardTitle>
            <CardDescription>
              Import the Excel workbook from Admin → History to populate past
              seasons. Historical managers stay in this archive only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/history"
              className={cn(buttonVariants(), "inline-flex")}
            >
              Open historical import
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { seasons, selected } = result.data;
  const detail = selected!;
  const currency = "NPR";

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          eyebrow="Archive"
          title="Past seasons"
          description="Gameweek winners, prizes, and career stats from earlier campaigns — separate from the live league."
        />
      </FadeIn>

      <FadeIn delay={0.03}>
        <div className="flex gap-1 rounded-xl border border-border/60 bg-muted/30 p-1">
          <Link
            href={`/past-seasons${seasonParam ? `?season=${encodeURIComponent(seasonParam)}` : ""}`}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              view === "archive"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Trophy className="size-3.5" />
            Season archive
          </Link>
          <Link
            href="/past-seasons?view=stats"
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
              view === "stats"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <BarChart3 className="size-3.5" />
            Career stats
          </Link>
        </div>
      </FadeIn>

      {view === "stats" ? (
        statsResult.kind === "ok" ? (
          <PastSeasonsStatsBoard stats={statsResult.data} />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">No stats yet</CardTitle>
              <CardDescription>
                Import more than one season to unlock improvement trends.
              </CardDescription>
            </CardHeader>
          </Card>
        )
      ) : (
        <>
          <FadeIn delay={0.04}>
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
              {seasons.map((season) => {
                const active = season.label === detail.season.label;
                return (
                  <Link
                    key={season.id}
                    href={`/past-seasons?season=${encodeURIComponent(season.label)}`}
                    className={cn(
                      "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {season.label}
                  </Link>
                );
              })}
            </div>
          </FadeIn>

          <FadeIn delay={0.06}>
            <section className="grid gap-3 sm:grid-cols-3">
              <StatCard
                label="Season"
                value={detail.season.label}
                hint={detail.season.name}
              />
              <StatCard
                label="Weekly winners"
                value={String(detail.weeklyWinners.length)}
                hint="Recorded gameweeks"
              />
              <StatCard
                label="Season prizes"
                value={String(detail.prizes.length)}
                hint="Final awards"
              />
            </section>
          </FadeIn>

          <FadeIn delay={0.08}>
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="size-4 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight">
                  Season prizes
                </h2>
              </div>
              {detail.prizes.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">No named prizes</CardTitle>
                    <CardDescription>
                      This season only has weekly winners in the archive (or
                      prizes weren’t recorded in the spreadsheet).
                    </CardDescription>
                  </CardHeader>
                </Card>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.prizes.map((prize) => (
                    <Card key={`${prize.prizeType}-${prize.managerId}`}>
                      <CardHeader className="pb-3">
                        <CardDescription className="flex items-center gap-1.5">
                          {prize.prizeType === "overall_1st" ? (
                            <Crown className="size-3.5 text-amber-500" />
                          ) : (
                            <Medal className="size-3.5 text-muted-foreground" />
                          )}
                          {prizeTypeLabel(prize.prizeType)}
                        </CardDescription>
                        <CardTitle className="flex items-center gap-3 text-base">
                          <ManagerAvatar name={prize.managerName} size="sm" />
                          {prize.managerName}
                        </CardTitle>
                      </CardHeader>
                      {prize.amount != null ? (
                        <CardContent className="pt-0 text-sm text-muted-foreground">
                          {formatMoney(Number(prize.amount), currency)}
                        </CardContent>
                      ) : null}
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          <FadeIn delay={0.1}>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Most weekly wins
              </h2>
              {detail.winCounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No weekly winners recorded for this season.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {detail.winCounts.slice(0, 9).map((row, index) => (
                    <div
                      key={row.managerId}
                      className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/40 px-3 py-2.5"
                    >
                      <Badge variant="secondary" className="w-8 justify-center">
                        {index + 1}
                      </Badge>
                      <ManagerAvatar name={row.managerName} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.managerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.wins} win{row.wins === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </FadeIn>

          <FadeIn delay={0.12}>
            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Weekly winners
              </h2>
              {detail.weeklyWinners.length === 0 ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">No weekly data</CardTitle>
                  </CardHeader>
                </Card>
              ) : (
                <Card>
                  <CardContent className="divide-y divide-border/60 p-0">
                    {detail.weeklyWinners.map((row) => (
                      <div
                        key={`${row.gameweek}-${row.managerId}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Badge
                          variant="outline"
                          className="w-14 justify-center"
                        >
                          GW{row.gameweek}
                        </Badge>
                        <ManagerAvatar name={row.managerName} size="sm" />
                        <p className="min-w-0 flex-1 truncate text-sm font-medium">
                          {row.managerName}
                        </p>
                        {row.points != null ? (
                          <p className="text-sm tabular-nums text-muted-foreground">
                            {row.points} pts
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </section>
          </FadeIn>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="py-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">
          {label}
        </p>
        <CardTitle className="text-2xl">{value}</CardTitle>
        {hint ? (
          <p className="text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}
