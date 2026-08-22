"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CircleHelp, Menu, Shirt, UserRound } from "lucide-react";
import { signOutAction } from "@/app/auth/actions";
import { Batch16Brand } from "@/components/brand/batch16-mark";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { FeatureErrorBoundary } from "@/components/error/feature-error-boundary";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type NavLink = { href: string; label: string };

const PRIMARY_LINKS: NavLink[] = [
  { href: "/league", label: "League" },
  { href: "/live", label: "Live" },
  { href: "/challenges", label: "Baaji" },
  { href: "/rivalries", label: "Rivalries" },
  { href: "/awards", label: "Awards" },
  { href: "/documentary", label: "Documentary" },
  { href: "/past-seasons", label: "Past seasons" },
  { href: "/guide", label: "Guide" },
];

function isActive(pathname: string, href: string) {
  if (href === "/league") return pathname === "/league";
  if (href === "/admin") return pathname.startsWith("/admin");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function linkClass(active: boolean) {
  return cn(
    "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-all",
    active
      ? "bg-primary/10 text-primary shadow-xs"
      : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  );
}

export function Navbar({
  authLabel,
  isAdmin = false,
  showNotifications = false,
  needsClaim = false,
}: {
  authLabel?: string | null;
  isAdmin?: boolean;
  showNotifications?: boolean;
  needsClaim?: boolean;
}) {
  const pathname = usePathname();
  const links = isAdmin
    ? [...PRIMARY_LINKS, { href: "/admin", label: "Admin" }]
    : PRIMARY_LINKS;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/75 shadow-xs backdrop-blur-xl supports-[backdrop-filter]:bg-background/65">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          href="/league"
          className="flex shrink-0 items-center font-semibold tracking-tight transition-opacity hover:opacity-90"
        >
          <Batch16Brand />
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(isActive(pathname, link.href))}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Compact nav between lg and xl — Guide always reachable */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:hidden">
          {links
            .filter(
              (link) =>
                !["/rivalries", "/past-seasons", "/awards"].includes(link.href),
            )
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(isActive(pathname, link.href))}
              >
                {link.label}
              </Link>
            ))}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          {needsClaim ? (
            <Link
              href="/auth/claim"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "hidden border-amber-500/40 text-amber-900 sm:inline-flex dark:text-amber-100",
              )}
            >
              Link manager
            </Link>
          ) : null}
          {showNotifications ? (
            <FeatureErrorBoundary feature="notifications" variant="silent">
              <NotificationBell />
            </FeatureErrorBoundary>
          ) : null}
          <AccountMenu label={authLabel ?? null} className="hidden sm:block" />
          <ThemeToggle />
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-4" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>Navigate</SheetTitle>
              </SheetHeader>
              <MobileNav
                pathname={pathname}
                authLabel={authLabel ?? null}
                links={links}
                needsClaim={needsClaim}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function AccountMenu({
  label,
  className,
}: {
  label: string | null;
  className?: string;
}) {
  if (!label) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
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

  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "gap-2 px-2",
          )}
        >
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {initial}
          </span>
          <span className="hidden max-w-28 truncate lg:inline">{label}</span>
          <ChevronDown className="size-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="truncate font-normal">
              {label}
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/dressing-room" />}>
            <Shirt className="size-4" />
            Dressing Room
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/guide" />}>
            <CircleHelp className="size-4" />
            Guide & FAQ
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/profile" />}>
            <UserRound className="size-4" />
            Avatar & club
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/auth/claim" />}>
            Account
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <form action={signOutAction}>
            <DropdownMenuItem
              nativeButton
              render={<button type="submit" />}
              variant="destructive"
            >
              Sign out
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function MobileNav({
  pathname,
  authLabel,
  links,
  needsClaim = false,
}: {
  pathname: string;
  authLabel: string | null;
  links: NavLink[];
  needsClaim?: boolean;
}) {
  return (
    <nav className="flex flex-col gap-4 px-4 pb-6">
      <div className="space-y-1">
        {links.map((link) => (
          <SheetTrigger
            key={link.href}
            render={
              <Link
                href={link.href}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium",
                  isActive(pathname, link.href)
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              />
            }
          >
            {link.label}
          </SheetTrigger>
        ))}
      </div>

      <div className="border-t border-border/70 pt-3">
        {needsClaim ? (
          <Link
            href="/auth/claim"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "mb-2 w-full justify-center border-amber-500/40 text-amber-900 dark:text-amber-100",
            )}
          >
            Link manager (Unverified)
          </Link>
        ) : null}
        {authLabel ? (
          <div className="space-y-2 px-1">
            <p className="truncate px-2 text-sm font-medium">{authLabel}</p>
            <form action={signOutAction}>
              <Button type="submit" variant="outline" size="sm" className="w-full">
                Sign out
              </Button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Link
              href="/auth/login"
              className={cn(buttonVariants({ variant: "ghost" }), "justify-start")}
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className={cn(buttonVariants({ variant: "outline" }), "justify-start")}
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
