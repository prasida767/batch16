"use client";

import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AuthNav({
  label,
  className,
}: {
  label: string | null;
  className?: string;
}) {
  if (label) {
    return (
      <div className={cn("items-center gap-2", className)}>
        <span className="max-w-[10rem] truncate text-xs text-muted-foreground">
          {label}
        </span>
        <form action={signOutAction}>
          <Button type="submit" variant="ghost" size="sm">
            Sign out
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className={cn("items-center gap-1", className)}>
      <Link
        href="/auth/login"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        Sign in
      </Link>
      <Link
        href="/auth/register"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        Register
      </Link>
    </div>
  );
}
