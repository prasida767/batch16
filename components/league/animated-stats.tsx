"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Coins, Scale, Trophy, Wallet, Zap } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { Stagger, StaggerItem } from "@/components/motion/page-transition";
import { easeOutSoft } from "@/components/motion/variants";
import { formatMoney } from "@/lib/prizes";

function AnimatedStatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      whileHover={reduce ? undefined : { y: -2 }}
      transition={{ duration: 0.2, ease: easeOutSoft }}
    >
      <Card className="h-full transition-shadow hover:shadow-soft">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {value}
            </CardTitle>
            {hint ? (
              <p className="text-xs text-muted-foreground">{hint}</p>
            ) : null}
          </div>
          {icon ? (
            <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          ) : null}
        </CardHeader>
      </Card>
    </motion.div>
  );
}

export function DashboardStatStrip({
  leaderName,
  leaderHint,
  gwLabel,
  gwValue,
  gwHint,
  pot,
  weeklyPaid,
  currency,
}: {
  leaderName: string;
  leaderHint: string;
  gwLabel: string;
  gwValue: number | null;
  gwHint: string;
  pot: number;
  weeklyPaid: number;
  currency: string;
}) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <StaggerItem>
        <AnimatedStatCard
          label="Leader"
          value={leaderName}
          hint={leaderHint}
          icon={<Trophy className="size-4" />}
        />
      </StaggerItem>
      <StaggerItem>
        <AnimatedStatCard
          label={gwLabel}
          value={
            gwValue != null ? (
              <AnimatedNumber value={gwValue} duration={0.45} />
            ) : (
              "—"
            )
          }
          hint={gwHint}
          icon={<Zap className="size-4" />}
        />
      </StaggerItem>
      <StaggerItem>
        <AnimatedStatCard
          label="Prize pot"
          value={<AnimatedMoney amount={pot} currency={currency} />}
          hint={`${formatMoney(weeklyPaid, currency)} paid in weekly prizes`}
          icon={<Coins className="size-4" />}
        />
      </StaggerItem>
    </Stagger>
  );
}

export function LedgerStatStrip({
  pot,
  weeklyPaid,
  remaining,
  potHint,
  weeklyHint,
  remainingLabel,
  remainingHint,
  currency,
}: {
  pot: number;
  weeklyPaid: number;
  remaining: number;
  potHint: string;
  weeklyHint: string;
  remainingLabel: string;
  remainingHint: string;
  currency: string;
}) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-3">
      <StaggerItem>
        <AnimatedStatCard
          label="Total pot"
          value={<AnimatedMoney amount={pot} currency={currency} />}
          hint={potHint}
          icon={<Wallet className="size-4" />}
        />
      </StaggerItem>
      <StaggerItem>
        <AnimatedStatCard
          label="Weekly paid"
          value={<AnimatedMoney amount={weeklyPaid} currency={currency} />}
          hint={weeklyHint}
          icon={<Coins className="size-4" />}
        />
      </StaggerItem>
      <StaggerItem>
        <AnimatedStatCard
          label={remainingLabel}
          value={<AnimatedMoney amount={remaining} currency={currency} />}
          hint={remainingHint}
          icon={<Scale className="size-4" />}
        />
      </StaggerItem>
    </Stagger>
  );
}
