"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app]", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] w-full max-w-lg flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Something went wrong
      </p>
      <h1 className="text-2xl font-semibold tracking-tight">
        That screen hit a snag
      </h1>
      <p className="text-sm text-muted-foreground">
        Try again. If it keeps happening, refresh the page or head back to the
        league.
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
