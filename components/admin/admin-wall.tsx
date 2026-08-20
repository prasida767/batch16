"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteWallPostAction } from "@/app/social/actions";
import type { ActionResult } from "@/lib/admin/shared";
import type { WallPostView } from "@/lib/social/wall";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AdminWall({ posts }: { posts: WallPostView[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);

  function remove(id: number) {
    if (!window.confirm("Delete this post?")) return;
    const fd = new FormData();
    fd.set("id", String(id));
    startTransition(async () => {
      const result = await deleteWallPostAction(fd);
      setFlash(result);
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-4">
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
          <CardTitle>Moderate wall</CardTitle>
          <CardDescription>Soft-delete posts that cross the line.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {posts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts.</p>
          ) : (
            posts.map((post) => (
              <div
                key={post.id}
                className="space-y-2 rounded-xl border border-border/70 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{post.managerName}</p>
                    <p className="text-sm whitespace-pre-wrap">{post.body}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pending}
                    onClick={() => remove(post.id)}
                  >
                    Delete
                  </Button>
                </div>
                {post.replies.map((reply) => (
                  <div
                    key={reply.id}
                    className="ml-3 flex items-start justify-between gap-3 border-l border-border/70 pl-3"
                  >
                    <div>
                      <p className="text-xs font-medium">{reply.managerName}</p>
                      <p className="text-sm whitespace-pre-wrap">{reply.body}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => remove(reply.id)}
                    >
                      Delete
                    </Button>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
