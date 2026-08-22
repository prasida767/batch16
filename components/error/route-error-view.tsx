"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { logAppError } from "@/lib/errors/log";

export function RouteErrorView({
  error,
  reset,
  title,
  feature = "route",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  feature?: string;
}) {
  useEffect(() => {
    logAppError(feature, error, { digest: error.digest });
  }, [error, feature]);

  return (
    <div
      className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center"
      role="alert"
    >
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {title}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        This page hit a snag
      </h1>
      <p className="text-sm text-muted-foreground">
        The rest of Batch 16 is still up. Try again, or head back to the league.
      </p>
      {error.digest ? (
        <p className="font-mono text-[11px] text-muted-foreground/80">
          Ref {error.digest}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button type="button" variant="outline" render={<Link href="/league" />}>
          Back to league
        </Button>
      </div>
    </div>
  );
}
