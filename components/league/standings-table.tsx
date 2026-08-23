"use client";

import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/league/verification-badge";
import {
  LiveBadge,
  ManagerAvatar,
} from "@/components/league/shared";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RankChange } from "@/components/motion/rank";
import { easeOutSoft } from "@/components/motion/variants";
import { rankDelta } from "@/lib/league/format";
import type { ManagerStanding } from "@/lib/league/types";
import { cn } from "@/lib/utils";

/** League table: rank, manager, team, GW, total, verified, activity, prize. */
export function StandingsTable({
  rows,
  currency,
  live,
  provisional,
  refreshing = false,
}: {
  rows: ManagerStanding[];
  currency: string;
  live: boolean;
  provisional?: boolean;
  refreshing?: boolean;
}) {
  const reduce = useReducedMotion();
  const showLive = live || provisional;
  const verifiedCount = rows.filter((row) => row.verified).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <CardTitle className="text-base">League table</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Current season from FPL. Prize money is allocated only after a
            manager verifies
            {rows.length > 0
              ? ` · ${verifiedCount}/${rows.length} in the pot`
              : ""}
          </p>
        </div>
        <LiveBadge
          live={live}
          provisional={provisional}
          refreshing={refreshing}
        />
      </CardHeader>
      <CardContent className="px-0 pb-0">
        {rows.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground sm:px-5">
            No managers to show yet. Standings appear once FPL publishes the
            league roster.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-y border-border/70 bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                  <th className="px-4 py-2.5 font-medium sm:px-5">#</th>
                  <th className="px-2 py-2.5 font-medium">Manager</th>
                  <th className="px-2 py-2.5 font-medium">Team</th>
                  <th className="px-2 py-2.5 font-medium">Status</th>
                  <th className="px-2 py-2.5 text-right font-medium">GW</th>
                  {showLive ? (
                    <th className="px-2 py-2.5 text-right font-medium">Live</th>
                  ) : null}
                  <th className="px-2 py-2.5 text-right font-medium">Total</th>
                  <th className="px-2 py-2.5 text-right font-medium">
                    Activity
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium sm:px-5">
                    Balance
                  </th>
                </tr>
              </thead>
              <LayoutGroup>
                <tbody>
                  {rows.map((row, index) => {
                    const rose = rankDelta(row.rank, row.lastRank) > 0;
                    return (
                      <motion.tr
                        key={row.entryId}
                        layout={!reduce}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                          backgroundColor: rose
                            ? [
                                "transparent",
                                "color-mix(in oklch, var(--primary) 10%, transparent)",
                                index === 0
                                  ? "color-mix(in oklch, var(--primary) 5%, transparent)"
                                  : "transparent",
                              ]
                            : index === 0
                              ? "color-mix(in oklch, var(--primary) 5%, transparent)"
                              : "transparent",
                        }}
                        transition={{
                          layout: { duration: 0.4, ease: easeOutSoft },
                          opacity: {
                            duration: 0.3,
                            delay: index * 0.03,
                            ease: easeOutSoft,
                          },
                          backgroundColor: { duration: 1, ease: "easeOut" },
                        }}
                        className={cn(
                          "border-b border-border/40 last:border-0",
                          index === 0 && "bg-primary/5",
                          !row.verified && "bg-muted/20",
                        )}
                      >
                        <td className="px-4 py-3 tabular-nums sm:px-5">
                          <RankChange rank={row.rank} lastRank={row.lastRank} />
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            href={`/managers/${row.entryId}`}
                            className={cn(
                              "group flex items-center gap-2.5 rounded-md outline-none transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring",
                              !row.verified && "opacity-80",
                            )}
                          >
                            <ManagerAvatar
                              name={row.displayName}
                              src={row.avatarUrl}
                              supportedTeamId={
                                row.verified ? row.supportedTeamId : null
                              }
                              supportedTeamCode={
                                row.verified ? row.supportedTeamCode : null
                              }
                              avatarVariant={row.avatarVariant}
                              size="sm"
                              className={
                                !row.verified ? "grayscale" : undefined
                              }
                            />
                            <span className="truncate font-medium">
                              {row.displayName}
                            </span>
                          </Link>
                        </td>
                        <td className="max-w-[10rem] px-2 py-3">
                          <span
                            className={cn(
                              "block truncate text-muted-foreground",
                              !row.verified && "opacity-80",
                            )}
                            title={row.teamName}
                          >
                            {row.teamName}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <VerificationBadge
                            verified={row.verified}
                            size="sm"
                          />
                        </td>
                        <td className="px-2 py-3 text-right text-muted-foreground tabular-nums">
                          <AnimatedNumber
                            value={row.eventPoints}
                            duration={showLive ? 0.45 : 0.7}
                          />
                        </td>
                        {showLive ? (
                          <td className="px-2 py-3 text-right font-semibold text-primary tabular-nums">
                            {row.livePoints != null ? (
                              <AnimatedNumber
                                value={row.livePoints}
                                duration={0.45}
                                highlightOnChange
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                        ) : null}
                        <td className="px-2 py-3 text-right font-semibold tabular-nums">
                          <AnimatedNumber
                            value={row.totalPoints}
                            duration={showLive ? 0.45 : 0.7}
                          />
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums text-muted-foreground">
                          <AnimatedNumber
                            value={row.activityPoints}
                            duration={0.5}
                          />
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          {row.verified ? (
                            <AnimatedMoney
                              amount={row.balance}
                              currency={currency}
                              signed
                            />
                          ) : (
                            <span
                              className="inline-flex max-w-[9.75rem] flex-col items-end text-right"
                              title="This manager hasn't claimed their seat yet, so their entry fee is not in the pot."
                            >
                              <span className="text-[11px] font-medium text-muted-foreground">
                                Waiting to join
                              </span>
                              <span className="text-[10px] leading-tight text-muted-foreground/80">
                                Not confirmed — not in the pot
                              </span>
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </LayoutGroup>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
