import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { ClubAvatar, PhotoAvatar } from "@/components/avatars/club-avatar";
import { AnimatedMoney } from "@/components/motion/animated-money";
import { AnimatedRankDelta } from "@/components/motion/rank";
import { PageSkeleton as MotionPageSkeleton } from "@/components/motion/skeletons";
import { buildClubAvatarSpec } from "@/lib/avatars/clubs";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2.5">
        {eyebrow ? (
          <Badge variant="secondary" className="font-medium tracking-wide">
            {eyebrow}
          </Badge>
        ) : null}
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description ? (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function LiveBadge({
  live,
  provisional,
  refreshing,
}: {
  live: boolean;
  provisional?: boolean;
  refreshing?: boolean;
}) {
  if (!live && !provisional) return null;
  return (
    <Badge
      variant="outline"
      className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    >
      <span
        className={`mr-1.5 inline-flex size-1.5 rounded-full bg-emerald-500 ${
          refreshing ? "animate-ping" : "animate-pulse"
        }`}
      />
      {live ? "Live" : "Provisional"}
      {refreshing ? (
        <span className="ml-1 font-normal opacity-70">updating</span>
      ) : null}
    </Badge>
  );
}

export function ManagerAvatar({
  name,
  src,
  size = "md",
  supportedTeamId,
  supportedTeamCode,
  avatarVariant = 0,
  animated = true,
  className,
}: {
  name: string;
  src?: string | null;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  supportedTeamId?: number | null;
  supportedTeamCode?: number | null;
  avatarVariant?: number | null;
  animated?: boolean;
  className?: string;
}) {
  const dim =
    size === "sm"
      ? "size-8 text-[10px]"
      : size === "lg"
        ? "size-14 text-base"
        : size === "xl"
          ? "size-20 text-lg"
          : size === "2xl"
            ? "size-28 text-2xl sm:size-32 sm:text-3xl"
            : "size-10 text-sm";

  if (supportedTeamId != null || supportedTeamCode != null) {
    const spec = buildClubAvatarSpec(
      supportedTeamId ?? 0,
      avatarVariant ?? 0,
      undefined,
      supportedTeamCode,
    );
    if (spec) {
      const clubSize =
        size === "2xl" ? "xl" : size === "xl" ? "xl" : size;
      return (
        <ClubAvatar
          spec={spec}
          size={clubSize}
          animated={animated}
          className={cn(size === "2xl" && "size-28 sm:size-32", className)}
        />
      );
    }
  }

  return (
    <PhotoAvatar name={name} src={src} className={cn(dim, className)} />
  );
}

export function MoneyText({
  amount,
  currency,
  signed = false,
  className,
}: {
  amount: number;
  currency: string;
  signed?: boolean;
  className?: string;
}) {
  return (
    <AnimatedMoney
      amount={amount}
      currency={currency}
      signed={signed}
      className={className}
    />
  );
}

export function RankDelta({
  rank,
  lastRank,
}: {
  rank: number;
  lastRank: number;
}) {
  return <AnimatedRankDelta rank={rank} lastRank={lastRank} />;
}

export function SetupState({
  title,
  body,
  href,
  cta = "Prize settings",
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
          {body}
        </p>
        {href ? (
          <Link
            href={href}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Trophy data-icon="inline-start" className="size-4" />
            {cta}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ErrorState({
  title = "This section couldn’t load",
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}

export function PageSkeleton({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "list" | "detail" | "ledger";
}) {
  return <MotionPageSkeleton variant={variant} />;
}
