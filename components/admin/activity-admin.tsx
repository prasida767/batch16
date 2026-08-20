"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import {
  adjustActivityPoints,
  saveActivityPrize,
} from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin/shared";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ManagerRow = {
  id: number;
  displayName: string;
  fplEntryId: number | null;
  activityPoints: number;
};

type ActivityEventView = {
  id: number;
  managerId: number;
  managerName: string;
  delta: number;
  reason: string;
  actionKey: string;
  createdAt: Date | string;
};

export function ActivityAdmin({
  managers,
  events,
  prizeDisplay,
}: {
  managers: ManagerRow[];
  events: ActivityEventView[];
  prizeDisplay: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);

  function run(
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
  ) {
    startTransition(async () => {
      const result = await action(formData);
      setFlash(result);
      if (result.ok) router.refresh();
    });
  }

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
          <CardTitle>Activity prize</CardTitle>
          <CardDescription>
            Completely separate from the money pot. Use a number (e.g. 5000) or
            leave as TBD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              run(saveActivityPrize, new FormData(event.currentTarget));
            }}
          >
            <div className="flex-1 space-y-2">
              <Label htmlFor="prizeDisplay">Prize display</Label>
              <Input
                id="prizeDisplay"
                name="prizeDisplay"
                defaultValue={prizeDisplay}
                placeholder="TBD"
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Save prize
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adjust points</CardTitle>
          <CardDescription>
            Add a positive number to award, or a negative number to subtract.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
            onSubmit={(event) => {
              event.preventDefault();
              run(adjustActivityPoints, new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="managerId">Manager</Label>
              <select
                id="managerId"
                name="managerId"
                required
                disabled={pending || managers.length === 0}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="" disabled>
                  Select manager
                </option>
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.displayName} ({manager.activityPoints} pts)
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="delta">Points (+/−)</Label>
              <Input
                id="delta"
                name="delta"
                type="number"
                step={1}
                required
                placeholder="10 or -5"
                disabled={pending}
              />
            </div>
            <div className="space-y-2 sm:col-span-2 lg:col-span-1">
              <Label htmlFor="reason">Reason</Label>
              <Input
                id="reason"
                name="reason"
                required
                placeholder="Voted in poll"
                disabled={pending}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="submit"
                className="w-full"
                disabled={pending || managers.length === 0}
              >
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                Apply
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current standings</CardTitle>
          <CardDescription>
            League managers only (historical imports excluded).
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {managers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Sync managers from FPL first.
            </p>
          ) : (
            [...managers]
              .sort(
                (a, b) =>
                  b.activityPoints - a.activityPoints ||
                  a.displayName.localeCompare(b.displayName),
              )
              .map((manager, index) => (
                <div
                  key={manager.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span className="w-8 text-sm text-muted-foreground">
                    #{index + 1}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {manager.displayName}
                  </p>
                  <p className="text-sm font-semibold tabular-nums">
                    {manager.activityPoints}
                  </p>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent changes</CardTitle>
          <CardDescription>Audit log from awardActivityPoints().</CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-border/60 p-0">
          {events.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              No activity awards yet.
            </p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
              >
                <p
                  className={cn(
                    "w-16 text-sm font-semibold tabular-nums",
                    event.delta > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {event.delta > 0 ? "+" : ""}
                  {event.delta}
                </p>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {event.managerName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {event.reason}
                    <span className="opacity-60"> · {event.actionKey}</span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatEventTime(event.createdAt)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatEventTime(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}
