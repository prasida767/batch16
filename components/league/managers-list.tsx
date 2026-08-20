"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EntryFeeBadge } from "@/components/league/entry-fee-badge";
import { VerificationBadge } from "@/components/league/verification-badge";
import { ManagerAvatar } from "@/components/league/shared";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { RankChange } from "@/components/motion/rank";
import { easeOutSoft } from "@/components/motion/variants";
import { Card, CardContent } from "@/components/ui/card";
import { rankDelta } from "@/lib/league/format";
import type { ManagerStanding } from "@/lib/league/types";
import { cn } from "@/lib/utils";

export function ManagersList({
  standings,
  currency,
}: {
  standings: ManagerStanding[];
  currency: string;
}) {
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-3">
      {standings.map((row, index) => {
        const rose = rankDelta(row.rank, row.lastRank) > 0;
        return (
          <motion.div
            key={row.entryId}
            layout={!reduce}
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{
              opacity: 1,
              y: 0,
              boxShadow: rose
                ? [
                    "0 0 0 0 transparent",
                    "0 0 0 1px color-mix(in oklch, var(--primary) 35%, transparent)",
                    "0 0 0 0 transparent",
                  ]
                : undefined,
            }}
            transition={{
              duration: 0.35,
              delay: index * 0.04,
              ease: easeOutSoft,
              layout: { duration: 0.4, ease: easeOutSoft },
            }}
            whileHover={reduce ? undefined : { y: -2 }}
          >
            <Link href={`/managers/${row.entryId}`} className="block">
              <Card
                className={cn(
                  "transition-colors hover:bg-muted/40",
                  row.rank === 1 && "ring-1 ring-primary/20",
                  !row.verified && "opacity-80",
                )}
              >
                <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-3 sm:contents">
                    <div className="flex w-12 flex-col items-center">
                      <RankChange rank={row.rank} lastRank={row.lastRank} />
                    </div>
                    <ManagerAvatar
                      name={row.displayName}
                      src={row.avatarUrl}
                      supportedTeamId={row.supportedTeamId}
                      supportedTeamCode={row.supportedTeamCode}
                      avatarVariant={row.avatarVariant}
                      className={!row.verified ? "grayscale-[40%]" : undefined}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium">{row.displayName}</p>
                        <VerificationBadge verified={row.verified} size="sm" />
                        <EntryFeeBadge paid={row.entryFeePaid} size="sm" />
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {row.teamName}
                        {row.weeksWon > 0
                          ? ` · ${row.weeksWon} weekly win${row.weeksWon === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
                    <p className="font-semibold">
                      <AnimatedNumber value={row.totalPoints} />
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        pts
                      </span>
                    </p>
                    <AnimatedMoney
                      amount={row.balance}
                      currency={currency}
                      signed
                    />
                  </div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
