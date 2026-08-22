"use client";

import { useEffect } from "react";
import { logAppError } from "@/lib/errors/log";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logAppError("global", error, { digest: error.digest });
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f4f7f5] px-4 text-[#0c1210]">
        <p className="text-xs font-semibold tracking-wide uppercase opacity-60">
          Batch 16
        </p>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="max-w-md text-center text-sm opacity-70">
          A critical error stopped this screen. Try again — your data is safe.
        </p>
        {error.digest ? (
          <p className="font-mono text-[11px] opacity-50">Ref {error.digest}</p>
        ) : null}
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[#14532d] px-3 py-2 text-sm font-medium text-white"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
