import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Banknote, Medal, Shirt, Sparkles, Zap } from "lucide-react";
import { EntryFeeBadge } from "@/components/league/entry-fee-badge";
import { VerificationBadge } from "@/components/league/verification-badge";
import { TeamPitch } from "@/components/league/pitch";
import {
  ErrorState,
  LiveBadge,
  ManagerAvatar,
  MoneyText,
  PageHeader,
} from "@/components/league/shared";
import { FadeIn } from "@/components/motion/page-transition";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { chipLabel, getManagerDetail } from "@/lib/league";
import { getManagerRivalryProfile } from "@/lib/rivalries";
import { ManagerRivalrySection } from "@/components/rivalries/manager-rivalry-section";

export const dynamic = "force-dynamic";

export default async function ManagerDetailPage({
  params,
}: {
  params: Promise<{ entryId: string }>;
}) {
  const { entryId: raw } = await params;
  const entryId = Number(raw);
  const result = await getManagerDetail(entryId);

  if (result.kind === "not_found") notFound();

  if (result.kind === "error") {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Manager" title="Manager" />
        <ErrorState message={result.message} />
      </div>
    );
  }

  const { data } = result;
  const currency = data.prize.currency;
  const captain = data.starters.find((player) => player.isCaptain);
  const vice = [...data.starters, ...data.bench].find((player) => player.isVice);
  const rivalry = await getManagerRivalryProfile(entryId);

  return (
    <div className="space-y-8">
      <FadeIn>
        <PageHeader
          eyebrow={data.standing ? `Rank ${data.standing.rank}` : "Manager"}
          title={data.playerName}
          description={`${data.teamName}${data.region ? ` · ${data.region}` : ""}`}
          actions={
            <>
              <LiveBadge
                live={data.meta.isLive}
                provisional={data.meta.isProvisional}
              />
              {data.standing ? (
                <>
                  <VerificationBadge verified={data.standing.verified} />
                  <EntryFeeBadge paid={data.standing.entryFeePaid} />
                </>
              ) : null}
              <Badge variant="secondary">
                {data.eventName ?? "Squad"}
              </Badge>
            </>
          }
        />
      </FadeIn>

      <FadeIn delay={0.05}>
        <div className="flex items-center gap-4">
          <ManagerAvatar
            name={data.playerName}
            src={data.standing?.avatarUrl}
            supportedTeamId={data.standing?.supportedTeamId}
            supportedTeamCode={data.standing?.supportedTeamCode}
            avatarVariant={data.standing?.avatarVariant}
            size="lg"
          />
          <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MiniStat
              icon={<Medal className="size-3.5" />}
              label="Total"
              value={<AnimatedNumber value={data.totalPoints} />}
            />
            <MiniStat
              icon={<Sparkles className="size-3.5" />}
              label={data.meta.isLive ? "Live GW" : "This GW"}
              value={<AnimatedNumber value={data.eventPoints} />}
            />
            <MiniStat
              icon={<Zap className="size-3.5" />}
              label="Activity"
              value={<AnimatedNumber value={data.activityPoints} />}
            />
            <MiniStat
              icon={<Shirt className="size-3.5" />}
              label="Squad value"
              value={
                <>
                  £
                  <AnimatedNumber
                    value={data.squadValue}
                    decimals={1}
                    locale={false}
                  />
                  m
                </>
              }
            />
            <MiniStat
              icon={<Banknote className="size-3.5" />}
              label="Balance"
              value={
                <AnimatedMoney amount={data.balance} currency={currency} />
              }
            />
          </div>
        </div>
      </FadeIn>

      <FadeIn delay={0.07}>
        <ManagerRivalrySection entryId={entryId} profile={rivalry} />
      </FadeIn>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Current team</CardTitle>
            <CardDescription>
              Formation view on the pitch
              {data.formation ? ` · ${data.formation}` : ""}
              {captain ? ` · Captain ${captain.webName}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.starters.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Picks for this gameweek aren’t available yet.
              </p>
            ) : (
              <TeamPitch
                starters={data.starters}
                bench={data.bench}
                formation={data.formation}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Captain & chips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Captain
                </p>
                <p className="mt-1 font-medium">
                  {captain
                    ? `${captain.webName} (${captain.points} pts)`
                    : "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Vice: {vice ? vice.webName : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Active chip
                </p>
                <p className="mt-1 font-medium">
                  {chipLabel(data.activeChip) ?? "None this GW"}
                </p>
              </div>
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Chips used
                </p>
                {data.chips.length === 0 ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    No chips played yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {data.chips.map((chip) => (
                      <li
                        key={`${chip.name}-${chip.event}`}
                        className="flex justify-between gap-2"
                      >
                        <span>{chipLabel(chip.name) ?? chip.name}</span>
                        <span className="text-muted-foreground">
                          GW {chip.event}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Overall rank</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {data.overallRank?.toLocaleString() ?? "—"}
              </p>
              <p className="text-sm text-muted-foreground">
                Bank £{data.bank.toFixed(1)}m
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Season history</CardTitle>
            <CardDescription>Points scored in each gameweek</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="max-h-112 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card">
                  <tr className="border-y text-left text-xs tracking-wide text-muted-foreground uppercase">
                    <th className="px-6 py-2 font-medium">GW</th>
                    <th className="px-2 py-2 text-right font-medium">Pts</th>
                    <th className="px-2 py-2 text-right font-medium">Hit</th>
                    <th className="px-6 py-2 text-right font-medium">OR</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.history].reverse().map((row) => {
                    const chip = data.chips.find((c) => c.event === row.event);
                    return (
                      <tr key={row.event} className="border-b last:border-0">
                        <td className="px-6 py-2.5">
                          <span className="font-medium">{row.event}</span>
                          {chip ? (
                            <Badge variant="outline" className="ml-2">
                              {chipLabel(chip.name)}
                            </Badge>
                          ) : null}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums font-medium">
                          {row.points}
                        </td>
                        <td className="px-2 py-2.5 text-right tabular-nums text-muted-foreground">
                          {row.event_transfers_cost
                            ? `−${row.event_transfers_cost}`
                            : "—"}
                        </td>
                        <td className="px-6 py-2.5 text-right tabular-nums text-muted-foreground">
                          {row.overall_rank?.toLocaleString() ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {data.history.length === 0 ? (
                <p className="px-6 py-8 text-sm text-muted-foreground">
                  No gameweek history yet.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Balance history</CardTitle>
            <CardDescription>
              Entry fee, weekly wins, and season prizes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.balanceEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No prize movements yet. Set amounts in{" "}
                <Link href="/admin/prizes" className="underline">
                  prize config
                </Link>
                .
              </p>
            ) : (
              <ol className="space-y-3">
                {data.balanceEvents.map((event, index) => (
                  <li
                    key={`${event.label}-${index}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{event.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Running{" "}
                        <MoneyText
                          amount={event.running}
                          currency={currency}
                          signed
                        />
                      </p>
                    </div>
                    <MoneyText
                      amount={event.amount}
                      currency={currency}
                      signed
                    />
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2 transition-colors hover:bg-muted/80">
      <p className="flex items-center gap-1 text-[11px] tracking-wide text-muted-foreground uppercase">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
