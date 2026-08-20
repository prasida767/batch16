import Link from "next/link";

/** Compact site footer — Guide + quiet league branding. */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/60 bg-background/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-xs sm:text-sm">
          Batch 16 — private FPL, loud opinions.
        </p>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <Link
            href="/guide"
            className="font-medium text-foreground/80 underline-offset-2 hover:text-foreground hover:underline"
          >
            Guide & FAQ
          </Link>
          <Link
            href="/dressing-room"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            Dressing Room
          </Link>
          <Link
            href="/league"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            League
          </Link>
        </nav>
      </div>
    </footer>
  );
}
