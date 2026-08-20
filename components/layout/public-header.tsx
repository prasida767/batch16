"use client";

import Link from "next/link";
import { Batch16Brand } from "@/components/brand/batch16-mark";
import { AuthNav } from "@/components/layout/auth-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 shadow-xs backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center font-semibold tracking-tight transition-opacity hover:opacity-90"
        >
          <Batch16Brand markClassName="size-8 sm:size-9" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/guide"
            className="hidden rounded-lg px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground sm:inline-flex"
          >
            Guide
          </Link>
          <AuthNav label={null} className="flex" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
