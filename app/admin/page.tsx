import Link from "next/link";
import {
  Calculator,
  History,
  Settings2,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import { AdminActionButton } from "@/components/admin/action-button";
import { PageHeader, SetupState } from "@/components/league/shared";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAdminOverview } from "@/app/admin/actions";
import { isDatabaseConfigured } from "@/lib/db";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  if (!isDatabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin"
          description="Manage managers, weekly winners, prizes, and balances."
        />
        <SetupState
          title="Connect the database"
          body="Set DATABASE_URL in .env.local and run npm run db:migrate before using admin tools."
        />
      </div>
    );
  }

  const overview = await getAdminOverview();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin overview"
        description="Keep managers, winners, entry fees, and the prize pot in sync with FPL."
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Managers"
          value={String(overview.managerCount)}
          hint={
            overview.historicalManagerCount > 0
              ? `+${overview.historicalManagerCount} historical (not in pot)`
              : undefined
          }
        />
        <Stat
          label="Weekly rows"
          value={String(overview.weeklyResultCount)}
        />
        <Stat
          label="Prize config"
          value={overview.hasPrizeConfig ? "Set" : "Missing"}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4 text-primary" />
              Managers
            </CardTitle>
            <CardDescription>
              Sync the roster, and mark entry fees paid when someone transfers
              their full entry fee.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/admin/managers"
              className={cn(buttonVariants(), "justify-center")}
            >
              Manage roster
            </Link>
            <AdminActionButton action="sync" label="Quick sync" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-4 text-primary" />
              Weekly winners
            </CardTitle>
            <CardDescription>
              Manually mark winners when there is a tie or the API is late.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/winners"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
            >
              Open winners
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="size-4 text-primary" />
              Balances
            </CardTitle>
            <CardDescription>
              Recompute prize positions from entry fees (paid/unpaid), weekly
              wins, and season prizes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminActionButton
              action="recalculate"
              label="Recalculate all balances"
              variant="default"
              confirm="Recalculate every manager balance from current prize rules and winners?"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="size-4 text-primary" />
              Baaji
            </CardTitle>
            <CardDescription>
              Declare winners on accepted side bets when a gameweek finishes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/challenges"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
            >
              Open Baaji
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              Historical import
            </CardTitle>
            <CardDescription>
              Load past gameweek winners and season prizes from the Excel
              workbook.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/history"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
            >
              Import history
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              Prize settings
            </CardTitle>
            <CardDescription>
              Entry fee, weekly payout, and season prizes (currency included).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/admin/settings"
              className={cn(
                buttonVariants({ variant: "outline" }),
                "w-full sm:w-auto",
              )}
            >
              Open settings
            </Link>
          </CardContent>
        </Card>
      </section>

      {!overview.leagueId ? (
        <p className="text-sm text-muted-foreground">
          Tip: set <code>FPL_LEAGUE_ID</code> so sync and recalculate can reach
          the classic league API.
        </p>
      ) : null}
    </div>
  );
}

function Stat({
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
