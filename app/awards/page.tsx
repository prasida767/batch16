import Link from "next/link";
import { Trophy } from "lucide-react";
import { PageHeader, SetupState, ErrorState } from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getAwardsPageData } from "@/app/social/actions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AwardsPage({
  searchParams,
}: {
  searchParams: Promise<{ gw?: string }>;
}) {
  const { gw } = await searchParams;
  const selected = gw ? Number(gw) : undefined;
  let data: Awaited<ReturnType<typeof getAwardsPageData>>;
  try {
    data = await getAwardsPageData(
      selected && Number.isInteger(selected) ? selected : undefined,
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Fun" title="Weekly awards" />
        <ErrorState
          message={
            error instanceof Error ? error.message : "Couldn't load awards."
          }
        />
      </div>
    );
  }

  if (data.kind === "no_db") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Fun"
          title="Weekly awards"
          description="Highest scores, climbs, and other weekly shout-outs."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL and run migrations first."
        />
      </div>
    );
  }

  if (data.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Fun"
          title="Weekly awards"
          description="Highest scores, climbs, and other weekly shout-outs."
        />
        <ErrorState message={data.message} />
      </div>
    );
  }

  const { gameweeks, gameweek, awards, hasLeague } = data;

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          eyebrow="Fun"
          title="Weekly awards"
          description="Auto-generated after gameweeks, with room for custom shout-outs."
          actions={
            <Link
              href="/admin/awards"
              className={cn(buttonVariants({ variant: "outline" }), "text-sm")}
            >
              Admin edit
            </Link>
          }
        />
      </FadeIn>

      {gameweeks.length > 0 ? (
        <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
          {gameweeks.map((gw) => {
            const active = gw === gameweek;
            return (
              <Link
                key={gw}
                href={`/awards?gw=${gw}`}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                GW{gw}
              </Link>
            );
          })}
        </div>
      ) : null}

      {gameweek == null ? (
        <Card>
          <CardHeader>
            <CardTitle>No awards yet</CardTitle>
            <CardDescription>
              {hasLeague
                ? "Generate awards from Admin → Awards once a gameweek has scores."
                : "Connect the league and finish a gameweek first."}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : awards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>GW{gameweek}</CardTitle>
            <CardDescription>
              No awards stored for this gameweek yet. An admin can generate
              them.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <section className="grid gap-3 sm:grid-cols-2">
          {awards.map((award) => (
            <Card key={award.id}>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-1.5">
                  <Trophy className="size-3.5 text-primary" />
                  {award.title}
                  {award.isAuto ? (
                    <Badge variant="secondary" className="ml-1">
                      Auto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="ml-1">
                      Custom
                    </Badge>
                  )}
                </CardDescription>
                <CardTitle className="text-base">
                  {award.managerName ?? "TBD"}
                </CardTitle>
              </CardHeader>
              {award.detail ? (
                <CardContent className="pt-0 text-sm text-muted-foreground">
                  {award.detail}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </section>
      )}
    </div>
  );
}
