"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useTweenedNumber } from "@/components/motion/use-tweened-number";
import { springSnappy } from "@/components/motion/variants";

type AnimatedNumberProps = {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  /** Format with locale grouping (1,234). */
  locale?: boolean;
  /** Brief highlight when the value changes. */
  highlightOnChange?: boolean;
};

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 0.85,
  className,
  prefix = "",
  suffix = "",
  locale = true,
  highlightOnChange = false,
}: AnimatedNumberProps) {
  const display = useTweenedNumber(value, duration);
  const reduce = useReducedMotion();
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (!highlightOnChange || reduce) {
      prev.current = value;
      return;
    }
    if (value === prev.current) return;
    setFlash(value > prev.current ? "up" : "down");
    prev.current = value;
    const t = window.setTimeout(() => setFlash(null), 700);
    return () => window.clearTimeout(t);
  }, [value, highlightOnChange, reduce]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : locale
        ? Math.round(display).toLocaleString()
        : String(Math.round(display));

  return (
    <motion.span
      className={cn(
        "inline-block tabular-nums transition-colors duration-300",
        flash === "up" && "text-emerald-600 dark:text-emerald-400",
        flash === "down" && "text-red-500",
        className,
      )}
      animate={
        flash && !reduce
          ? { scale: [1, 1.06, 1] }
          : { scale: 1 }
      }
      transition={springSnappy}
    >
      {prefix}
      {formatted}
      {suffix}
    </motion.span>
  );
}
