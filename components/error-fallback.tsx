"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Route-level error UI. Nav / shell stay mounted around this. */
export function RouteError({
  error,
  reset,
  section,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  section: string;
}) {
  useEffect(() => {
    console.error(`[${section}]`, error);
  }, [error, section]);

  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {section}
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        This page hit a snag
      </h1>
      <p className="text-sm text-muted-foreground">
        The rest of Batch 16 is still up. Try again, or head back to the league.
      </p>
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
