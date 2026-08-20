"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Flag, LoaderCircle, Plus, Trash2 } from "lucide-react";
import {
  addManager,
  removeManager,
  setEntryFeePaid,
  updateManager,
} from "@/app/admin/actions";
import type { ActionResult } from "@/lib/admin/shared";
import { AdminActionButton } from "@/components/admin/action-button";
import { EntryFeeBadge } from "@/components/league/entry-fee-badge";
import { VerificationBadge } from "@/components/league/verification-badge";
import { AnimatedMoney } from "@/components/motion/animated-money";
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
  fplEntryId: number | null;
  name: string;
  displayName: string;
  currentBalance: string | null;
  entryFeePaid: boolean;
  verified: boolean;
};

export function ManagersAdmin({
  managers,
  currency,
}: {
  managers: ManagerRow[];
  currency: string;
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
      <Card>
        <CardHeader>
          <CardTitle>Sync from FPL</CardTitle>
          <CardDescription>
            Pull every manager in your classic league into the database. Required
            before marking winners or recalculating balances.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminActionButton
            action="sync"
            label="Sync league managers"
            variant="default"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add manager</CardTitle>
          <CardDescription>
            Add someone by FPL entry ID (from their team URL).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              run(addManager, new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="fplEntryId">FPL entry ID</Label>
              <Input
                id="fplEntryId"
                name="fplEntryId"
                inputMode="numeric"
                placeholder="1234567"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="displayName">Display name (optional)</Label>
              <Input
                id="displayName"
                name="displayName"
                placeholder="Overrides FPL name"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={pending} className="w-full">
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Plus className="size-4" data-icon="inline-start" />
                )}
                Add
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {flash ? (
        <p
          className={cn(
            "text-sm",
            flash.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive",
          )}
        >
          {flash.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>League managers</CardTitle>
          <CardDescription>
            {managers.length} synced from FPL ·{" "}
            {managers.filter((m) => m.verified).length}/{managers.length} verified
            (claimed) ·{" "}
            {managers.filter((m) => m.entryFeePaid).length}/{managers.length}{" "}
            entry fees paid. Synced managers stay Unverified until they register
            and claim. Use{" "}
            <span className="font-medium text-foreground">Flag as paid</span>{" "}
            when payment lands — everyone sees it on the League table.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {managers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No managers yet. Sync from FPL or add one manually.
            </p>
          ) : (
            managers.map((manager) => (
              <div
                key={manager.id}
                className="flex flex-col gap-3 rounded-xl border border-border/70 p-3 sm:flex-row sm:items-center"
              >
                <form
                  className="grid flex-1 gap-2 sm:grid-cols-[1fr_auto]"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(updateManager, new FormData(event.currentTarget));
                  }}
                >
                  <input type="hidden" name="managerId" value={manager.id} />
                  <div className="min-w-0 space-y-1">
                    <Input
                      name="displayName"
                      defaultValue={manager.displayName}
                      className="font-medium"
                    />
                    <p className="truncate text-xs text-muted-foreground">
                      Entry {manager.fplEntryId}
                      {manager.currentBalance != null ? (
                        <>
                          {" · "}
                          <AnimatedMoney
                            amount={Number(manager.currentBalance)}
                            currency={currency}
                            signed
                            className="text-xs"
                          />
                        </>
                      ) : null}
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      <VerificationBadge
                        verified={manager.verified}
                        size="sm"
                      />
                      <EntryFeeBadge paid={manager.entryFeePaid} size="sm" />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" variant="secondary" disabled={pending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant={manager.entryFeePaid ? "outline" : "default"}
                      disabled={pending}
                      className={cn(
                        manager.entryFeePaid
                          ? "border-emerald-500/40 text-emerald-800 dark:text-emerald-300"
                          : "bg-amber-600 text-white hover:bg-amber-600/90",
                      )}
                      onClick={() => {
                        const fd = new FormData();
                        fd.set("managerId", String(manager.id));
                        fd.set("paid", manager.entryFeePaid ? "false" : "true");
                        run(setEntryFeePaid, fd);
                      }}
                    >
                      <Flag className="size-3.5" />
                      {manager.entryFeePaid ? "Unflag unpaid" : "Flag as paid"}
                    </Button>
                  </div>
                </form>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (
                      !window.confirm(
                        `Remove ${manager.displayName}? This cannot be undone.`,
                      )
                    ) {
                      return;
                    }
                    run(removeManager, new FormData(event.currentTarget));
                  }}
                >
                  <input type="hidden" name="managerId" value={manager.id} />
                  <Button
                    type="submit"
                    variant="destructive"
                    disabled={pending}
                    className="w-full sm:w-auto"
                  >
                    <Trash2 className="size-4" data-icon="inline-start" />
                    Remove
                  </Button>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
