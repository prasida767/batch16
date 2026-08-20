"use client";

import Link from "next/link";
import { Heart, Skull } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { ManagerAvatar } from "@/components/league/shared";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ManagerRivalryProfile } from "@/lib/rivalries/compute";

function counterpart(
  profile: NonNullable<ManagerRivalryProfile["nemesis"]>,
  entryId: number,
) {
  return profile.a.entryId === entryId ? profile.b : profile.a;
}

function recordLine(
  pair: NonNullable<ManagerRivalryProfile["nemesis"]>,
  entryId: number,
) {
  const iAmA = pair.a.entryId === entryId;
  const wins = iAmA ? pair.record.aWins : pair.record.bWins;
  const losses = iAmA ? pair.record.bWins : pair.record.aWins;
  return `${wins}–${losses}`;
}

export function ManagerRivalrySection({
  entryId,
  profile,
}: {
  entryId: number;
  profile: ManagerRivalryProfile | null;
}) {
  const reduce = useReducedMotion();

  if (!profile?.nemesis && !profile?.luckyCharm) {
    return null;
  }

  return (
    <motion.section
      className="space-y-3"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Rivalries</h2>
        <Link
          href="/rivalries"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Full heatmap
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {profile.nemesis ? (
          <Card className="border-rose-500/25 bg-rose-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                <Skull className="size-3.5" />
                Nemesis
              </CardDescription>
              <CardTitle className="flex items-center gap-3 text-base">
                <ManagerAvatar
                  name={counterpart(profile.nemesis, entryId).displayName}
                  supportedTeamId={
                    counterpart(profile.nemesis, entryId).supportedTeamId
                  }
                  supportedTeamCode={
                    counterpart(profile.nemesis, entryId).supportedTeamCode
                  }
                  avatarVariant={
                    counterpart(profile.nemesis, entryId).avatarVariant
                  }
                  size="sm"
                />
                <Link
                  href={`/managers/${counterpart(profile.nemesis, entryId).entryId}`}
                  className="hover:underline"
                >
                  {counterpart(profile.nemesis, entryId).displayName}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Beats you most consistently · you trail{" "}
              <span className="font-semibold text-foreground">
                {recordLine(profile.nemesis, entryId)}
              </span>
            </CardContent>
          </Card>
        ) : null}

        {profile.luckyCharm ? (
          <Card className="border-emerald-500/25 bg-emerald-500/5">
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                <Heart className="size-3.5" />
                Lucky charm
              </CardDescription>
              <CardTitle className="flex items-center gap-3 text-base">
                <ManagerAvatar
                  name={counterpart(profile.luckyCharm, entryId).displayName}
                  supportedTeamId={
                    counterpart(profile.luckyCharm, entryId).supportedTeamId
                  }
                  supportedTeamCode={
                    counterpart(profile.luckyCharm, entryId).supportedTeamCode
                  }
                  avatarVariant={
                    counterpart(profile.luckyCharm, entryId).avatarVariant
                  }
                  size="sm"
                />
                <Link
                  href={`/managers/${counterpart(profile.luckyCharm, entryId).entryId}`}
                  className="hover:underline"
                >
                  {counterpart(profile.luckyCharm, entryId).displayName}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Your favourite victim · you lead{" "}
              <span className="font-semibold text-foreground">
                {recordLine(profile.luckyCharm, entryId)}
              </span>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </motion.section>
  );
}
