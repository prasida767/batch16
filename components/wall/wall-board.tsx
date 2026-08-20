"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle } from "lucide-react";
import { postWallMessage } from "@/app/social/actions";
import { AuthIdentityCard } from "@/components/auth/auth-identity-card";
import type { ActionResult } from "@/lib/admin/shared";
import type { WallPostView } from "@/lib/social/wall";
import { WALL_POST_ACTIVITY } from "@/lib/social/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ManagerOption = { id: number; displayName: string };

export function WallBoard({
  actingManagerId,
  actingName,
  managers: _managers,
  posts,
}: {
  actingManagerId: number | null;
  actingName: string | null;
  managers: ManagerOption[];
  posts: WallPostView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [replyTo, setReplyTo] = useState<number | null>(null);

  function run(
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
  ) {
    startTransition(async () => {
      const result = await action(formData);
      setFlash(result);
      if (result.ok) {
        setReplyTo(null);
        router.refresh();
      }
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

      <AuthIdentityCard actingName={actingName} context="wall" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {replyTo ? "Reply" : "New post"}
          </CardTitle>
          <CardDescription>
            +{WALL_POST_ACTIVITY} activity points per message. Keep it civil.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              run(postWallMessage, new FormData(event.currentTarget));
              event.currentTarget.reset();
            }}
          >
            {replyTo != null ? (
              <input type="hidden" name="parentId" value={replyTo} />
            ) : null}
            <Input
              name="body"
              required
              maxLength={500}
              placeholder="Say something..."
              disabled={pending || !actingManagerId}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending || !actingManagerId}>
                {pending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                {replyTo ? "Reply" : "Post"}
              </Button>
              {replyTo != null ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => setReplyTo(null)}
                >
                  Cancel reply
                </Button>
              ) : null}
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Recent</h2>
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              No posts yet. Be the first.
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {post.managerName}
                </CardTitle>
                <CardDescription>
                  {formatTime(post.createdAt)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={!actingManagerId || pending}
                  onClick={() => setReplyTo(post.id)}
                >
                  Reply
                </Button>
                {post.replies.length > 0 ? (
                  <div className="space-y-3 border-l border-border/70 pl-3">
                    {post.replies.map((reply) => (
                      <div key={reply.id} className="space-y-1">
                        <p className="text-xs font-medium">
                          {reply.managerName}{" "}
                          <span className="font-normal text-muted-foreground">
                            · {formatTime(reply.createdAt)}
                          </span>
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {reply.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}

function formatTime(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}
