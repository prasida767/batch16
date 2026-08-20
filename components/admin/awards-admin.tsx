"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import {
  deleteAwardAction,
  generateAwardsAction,
  saveAwardAction,
} from "@/app/social/actions";
import type { ActionResult } from "@/lib/admin/shared";
import type { AwardView } from "@/lib/social/types";
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

type ManagerOption = { id: number; displayName: string };

export function AwardsAdmin({
  gameweek,
  gameweeks,
  awards,
  managers,
}: {
  gameweek: number | null;
  gameweeks: number[];
  awards: AwardView[];
  managers: ManagerOption[];
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
          <CardTitle>Generate auto awards</CardTitle>
          <CardDescription>
            Highest score, best differential (vs avg), biggest climb, worst
            week. Re-running refreshes the four standard awards.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              run(generateAwardsAction, new FormData(event.currentTarget));
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="gameweek">Gameweek</Label>
              <Input
                id="gameweek"
                name="gameweek"
                type="number"
                min={1}
                max={38}
                required
                defaultValue={gameweek ?? gameweeks[0] ?? 1}
                disabled={pending}
              />
            </div>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              Generate
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add custom award</CardTitle>
          <CardDescription>
            For the selected gameweek
            {gameweek != null ? ` (GW${gameweek})` : ""}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              run(saveAwardAction, new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            <input
              type="hidden"
              name="gameweek"
              value={gameweek ?? gameweeks[0] ?? 1}
            />
            <input type="hidden" name="awardKey" value="custom" />
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Captain Marvel"
                disabled={pending || gameweek == null}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="managerId">Manager (optional)</Label>
              <select
                id="managerId"
                name="managerId"
                disabled={pending || gameweek == null}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                defaultValue=""
              >
                <option value="">None</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="detail">Detail</Label>
              <Input
                id="detail"
                name="detail"
                placeholder="Haaland (C) hauled"
                disabled={pending || gameweek == null}
              />
            </div>
            <Button type="submit" disabled={pending || gameweek == null}>
              Add award
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Awards{gameweek != null ? ` · GW${gameweek}` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {awards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No awards yet.</p>
          ) : (
            awards.map((award) => (
              <div
                key={award.id}
                className="space-y-2 rounded-xl border border-border/70 p-3"
              >
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(saveAwardAction, new FormData(event.currentTarget));
                  }}
                >
                  <input type="hidden" name="id" value={award.id} />
                  <input type="hidden" name="gameweek" value={award.gameweek} />
                  <input type="hidden" name="awardKey" value={award.awardKey} />
                  <Input
                    name="title"
                    defaultValue={award.title}
                    disabled={pending}
                  />
                  <select
                    name="managerId"
                    defaultValue={award.managerId ?? ""}
                    disabled={pending}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  >
                    <option value="">None</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName}
                      </option>
                    ))}
                  </select>
                  <Input
                    name="detail"
                    defaultValue={award.detail ?? ""}
                    disabled={pending}
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={pending}>
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => {
                        if (!window.confirm("Delete this award?")) return;
                        const fd = new FormData();
                        fd.set("id", String(award.id));
                        run(deleteAwardAction, fd);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </form>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
