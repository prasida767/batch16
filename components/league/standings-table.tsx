"use client";

import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntryFeeBadge } from "@/components/league/entry-fee-badge";
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

/** Single compact league table: rank, points, weekly wins, prize balance. */
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
  const paidCount = rows.filter((row) => row.entryFeePaid).length;
  const verifiedCount = rows.filter((row) => row.verified).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <CardTitle className="text-base">League table</CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            FPL points, verification, entry fees, weekly wins, and prize balance
            {rows.length > 0
              ? ` · ${verifiedCount}/${rows.length} verified · ${paidCount}/${rows.length} paid`
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-y border-border/70 bg-muted/30 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                <th className="px-4 py-2.5 font-medium sm:px-5">#</th>
                <th className="px-2 py-2.5 font-medium">Manager</th>
                <th className="px-2 py-2.5 text-center font-medium">Entry</th>
                <th className="px-2 py-2.5 text-right font-medium">GW</th>
                {showLive ? (
                  <th className="px-2 py-2.5 text-right font-medium">Live</th>
                ) : null}
                <th className="px-2 py-2.5 text-right font-medium">Total</th>
                <th className="px-2 py-2.5 text-right font-medium">Wins</th>
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
                            !row.verified && "opacity-75",
                          )}
                        >
                          <ManagerAvatar
                            name={row.displayName}
                            src={row.avatarUrl}
                            supportedTeamId={row.supportedTeamId}
                            supportedTeamCode={row.supportedTeamCode}
                            avatarVariant={row.avatarVariant}
                            size="sm"
                            className={!row.verified ? "grayscale-[40%]" : undefined}
                          />
                          <span className="min-w-0">
                            <span className="flex items-center gap-1.5 truncate">
                              <span className="truncate font-medium">
                                {row.displayName}
                              </span>
                              <VerificationBadge
                                verified={row.verified}
                                size="sm"
                                className="shrink-0"
                              />
                            </span>
                            <span className="flex items-center gap-2 truncate text-xs text-muted-foreground">
                              <span className="truncate">{row.teamName}</span>
                              <span
                                className="shrink-0 tabular-nums"
                                title="Activity points"
                              >
                                <span className="font-medium text-foreground/80">
                                  {row.activityPoints}
                                </span>{" "}
                                activity points
                              </span>
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-2 py-3 text-center">
                        <div className="flex justify-center">
                          <EntryFeeBadge paid={row.entryFeePaid} size="sm" />
                        </div>
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
                        {row.weeksWon > 0 ? (
                          <span className="font-medium text-foreground">
                            {row.weeksWon}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <AnimatedMoney
                          amount={row.balance}
                          currency={currency}
                          signed
                        />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </LayoutGroup>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
