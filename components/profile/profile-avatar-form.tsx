"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAvatarAction } from "@/app/profile/actions";
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
import { Label } from "@/components/ui/label";
import {
  buildClubAvatarSpec,
  type ClubDefinition,
} from "@/lib/avatars/clubs";
import { cn } from "@/lib/utils";

export function ProfileAvatarForm({
  clubs,
  initialTeamId,
  initialVariant,
  displayName,
}: {
  clubs: ClubDefinition[];
  initialTeamId: number;
  initialVariant: number;
  displayName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [supportedTeamId, setSupportedTeamId] = useState(initialTeamId);
  const [avatarVariant, setAvatarVariant] = useState(initialVariant);

  const preview = useMemo(
    () => buildClubAvatarSpec(supportedTeamId, avatarVariant, clubs),
    [supportedTeamId, avatarVariant, clubs],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Crest avatar</CardTitle>
        <CardDescription>
          {displayName} — pick your club and a unique animated style. Everyone
          in the league will see it on standings, live, and challenges.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-4">
          {preview ? <ClubAvatar spec={preview} size="xl" /> : null}
          <div>
            <p className="font-medium">{preview?.name ?? "Choose a club"}</p>
            <p className="text-xs text-muted-foreground">
              Style {avatarVariant + 1} of 8
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="club">Supported club</Label>
          <select
            id="club"
            className="flex h-10 w-full max-w-md rounded-lg border border-input bg-background px-3 text-sm"
            value={supportedTeamId}
            onChange={(event) => setSupportedTeamId(Number(event.target.value))}
          >
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label>Avatar style</Label>
          <AvatarVariantPicker
            teamId={supportedTeamId}
            clubs={clubs}
            value={avatarVariant}
            onChange={setAvatarVariant}
          />
        </div>

        {flash ? (
          <p
            className={cn(
              "text-sm",
              flash.ok ? "text-primary" : "text-destructive",
            )}
          >
            {flash.message}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={pending}
          onClick={() => {
            const fd = new FormData();
            fd.set("supportedTeamId", String(supportedTeamId));
            fd.set("avatarVariant", String(avatarVariant));
            startTransition(async () => {
              const result = await updateAvatarAction(fd);
              setFlash(result);
              if (result.ok) router.refresh();
            });
          }}
        >
          {pending ? "Saving…" : "Save avatar"}
        </Button>
      </CardContent>
    </Card>
  );
}
