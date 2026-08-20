"use client";

import { formatMoney } from "@/lib/prizes";
import { cn } from "@/lib/utils";
import { useTweenedNumber } from "@/components/motion/use-tweened-number";

type AnimatedMoneyProps = {
  amount: number;
  currency: string;
  signed?: boolean;
  className?: string;
  duration?: number;
};

export function AnimatedMoney({
  amount,
  currency,
  signed = false,
  className,
  duration = 0.9,
}: AnimatedMoneyProps) {
  const display = useTweenedNumber(amount, duration);

  const absFormatted = formatMoney(Math.abs(display), currency);
  const label =
    signed && display > 0.005
      ? `+${absFormatted}`
      : signed && display < -0.005
        ? `−${absFormatted}`
        : formatMoney(display, currency);

  const tone =
    amount > 0.005
      ? "text-emerald-600 dark:text-emerald-400"
      : amount < -0.005
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  return (
    <span className={cn("font-medium tabular-nums", tone, className)}>
      {label}
    </span>
  );
}
