"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { adminResolveChallengeAction } from "@/app/challenges/actions";
import type { ActionResult } from "@/lib/admin/shared";
import type { ChallengeView } from "@/lib/challenges/types";
import { CHALLENGE_STATUS } from "@/lib/challenges/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminChallenges({
  accepted,
  season,
}: {
  accepted: ChallengeView[];
  season: ChallengeView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);

  return (
    <div className="space-y-6">
      {flash ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            flash.ok
              ? "border-emerald-500/30 bg-emerald-500/5"
              : "border-destructive/30 bg-destructive/5",
          )}
        >
          {flash.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Declare winners</CardTitle>
          <CardDescription>
            Accepted baaji waiting for a result. Only admins can mark the
            winner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accepted.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No accepted baaji waiting for a result.
            </p>
          ) : (
            accepted.map((challenge) => (
              <div
                key={challenge.id}
                className="space-y-3 rounded-xl border border-border/70 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{challenge.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.creatorName} challenged {challenge.opponentName}
                    {challenge.gameweek != null
                      ? ` · GW${challenge.gameweek}`
                      : ""}
                    {challenge.stakeNpr != null
                      ? ` · NPR ${challenge.stakeNpr}`
                      : ""}
                  </p>
                </div>
                <form
                  className="flex flex-col gap-2 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    startTransition(async () => {
                      const result =
                        await adminResolveChallengeAction(formData);
                      setFlash(result);
                      if (result.ok) router.refresh();
                    });
                  }}
                >
                  <input
                    type="hidden"
                    name="challengeId"
                    value={challenge.id}
                  />
                  <select
                    name="winnerId"
                    required
                    disabled={pending}
                    className="flex h-9 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Winner
                    </option>
                    <option value={challenge.creatorId}>
                      {challenge.creatorName}
                    </option>
                    <option value={challenge.opponentId}>
                      {challenge.opponentName}
                    </option>
                  </select>
                  <Button type="submit" size="sm" disabled={pending}>
                    {pending ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : null}
                    Mark winner
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Season log</CardTitle>
          <CardDescription>
            Every baaji posted this season ({season.length}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {season.length === 0 ? (
            <p className="text-sm text-muted-foreground">No baaji yet.</p>
          ) : (
            season.map((challenge) => (
              <div
                key={challenge.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{challenge.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {challenge.creatorName} challenged {challenge.opponentName}
                    {challenge.status === CHALLENGE_STATUS.DECLINED
                      ? ` · Manager '${challenge.opponentName}', Manager '${challenge.creatorName}' sanga darayo`
                      : ""}
                    {challenge.winnerName
                      ? ` · Winner: ${challenge.winnerName}`
                      : ""}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    challenge.status === CHALLENGE_STATUS.ACCEPTED &&
                      "border-emerald-500/30 bg-emerald-500/10",
                    challenge.status === CHALLENGE_STATUS.PENDING &&
                      "border-amber-500/30 bg-amber-500/10",
                    challenge.status === CHALLENGE_STATUS.DECLINED &&
                      "border-destructive/30 bg-destructive/10",
                  )}
                >
                  {challenge.status === CHALLENGE_STATUS.DECLINED
                    ? "Darayo"
                    : challenge.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
