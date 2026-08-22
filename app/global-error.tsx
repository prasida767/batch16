"use client";

import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-foreground">
        <h1 className="text-xl font-semibold">Batch 16 hit a snag</h1>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          A critical error stopped the page from loading. Try again or refresh.
        </p>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
