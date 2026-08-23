"use client";

import { useActionState, useMemo, useState } from "react";
import { claimManagerAction } from "@/app/auth/actions";
import type { ActionResult } from "@/lib/admin/shared";
import {
  AvatarVariantPicker,
  ClubAvatar,
} from "@/components/avatars/club-avatar";
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
import {
  buildClubAvatarSpec,
  defaultAvatarVariant,
  type ClubDefinition,
} from "@/lib/avatars/clubs";
import { cn } from "@/lib/utils";

export function ClaimForm({
  email,
  nextPath,
  clubs,
}: {
  email: string;
  nextPath?: string | null;
  clubs: ClubDefinition[];
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(claimManagerAction, null);
  const [supportedTeamId, setSupportedTeamId] = useState<number>(
    clubs[0]?.id ?? 1,
  );
  const [avatarVariant, setAvatarVariant] = useState(0);

  const preview = useMemo(
    () => buildClubAvatarSpec(supportedTeamId, avatarVariant, clubs),
    [supportedTeamId, avatarVariant, clubs],
  );

  return (
    <Card className="mx-auto w-full max-w-lg">
      <CardHeader>
        <CardTitle>Verify your manager</CardTitle>
        <CardDescription>
          Signed in as {email}. Enter your FPL team name, the name from the
          standings, or both — spelling doesn&apos;t have to be exact. Then pick
          the Premier League club you support for your crest avatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {nextPath ? (
            <input type="hidden" name="next" value={nextPath} />
          ) : null}
          <input type="hidden" name="supportedTeamId" value={supportedTeamId} />
          <input type="hidden" name="avatarVariant" value={avatarVariant} />

          <div className="space-y-2">
            <Label htmlFor="fullName">Manager name</Label>
            <Input
              id="fullName"
              name="fullName"
              placeholder="e.g. Prasiddha Khadka"
              autoComplete="name"
            />
            <p className="text-xs text-muted-foreground">
              The name shown in the league standings. Extra spaces and small
              spelling differences are fine.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="teamName">FPL team name</Label>
            <Input
              id="teamName"
              name="teamName"
              placeholder="Your team name on FPL"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              The fantasy team name in this league — not your club or email.
              You can enter name, team, or both.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="entryId">FPL entry ID (optional)</Label>
            <Input
              id="entryId"
              name="entryId"
              placeholder="From fantasy.premierleague.com/entry/XXXXXX/"
              autoComplete="off"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supportedClub">Club you support</Label>
            <select
              id="supportedClub"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={supportedTeamId}
              onChange={(event) => {
                const id = Number(event.target.value);
                setSupportedTeamId(id);
                setAvatarVariant(defaultAvatarVariant(id * 7, id));
              }}
              required
            >
              {clubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
            <div className="flex items-center gap-3">
              {preview ? <ClubAvatar spec={preview} size="xl" /> : null}
              <div>
                <p className="text-sm font-medium">Your avatar</p>
                <p className="text-xs text-muted-foreground">
                  Pick a style — each one animates differently.
                </p>
              </div>
            </div>
            <AvatarVariantPicker
              teamId={supportedTeamId}
              clubs={clubs}
              value={avatarVariant}
              onChange={setAvatarVariant}
            />
          </div>

          {state ? (
            <p
              className={cn(
                "text-sm",
                state.ok ? "text-primary" : "text-destructive",
              )}
            >
              {state.message}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Verifying…" : "Verify & create avatar"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
