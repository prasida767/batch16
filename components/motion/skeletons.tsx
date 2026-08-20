"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

function Bone({
  className,
  shimmer,
}: {
  className?: string;
  shimmer: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        className,
      )}
    >
      {shimmer ? (
        <motion.div
          className="absolute inset-0 -translate-x-full bg-linear-to-r from-transparent via-white/10 to-transparent"
          animate={{ translateX: ["-100%", "100%"] }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ) : null}
    </div>
  );
}

export function PageSkeleton({
  variant = "dashboard",
}: {
  variant?: "dashboard" | "list" | "detail" | "ledger";
}) {
  const reduce = useReducedMotion();
  const shimmer = !reduce;

  return (
    <motion.div
      className="space-y-6"
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="space-y-2">
        <Bone shimmer={shimmer} className="h-5 w-24 rounded-full" />
        <Bone shimmer={shimmer} className="h-9 w-64" />
        <Bone shimmer={shimmer} className="h-4 w-full max-w-md" />
      </div>

      {variant === "dashboard" || variant === "ledger" ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Bone shimmer={shimmer} className="h-28 rounded-xl" />
          <Bone shimmer={shimmer} className="h-28 rounded-xl" />
          <Bone shimmer={shimmer} className="h-28 rounded-xl" />
        </div>
      ) : null}

      {variant === "list" ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Bone key={i} shimmer={shimmer} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : null}

      {variant === "detail" ? (
        <>
          <div className="flex items-center gap-4">
            <Bone shimmer={shimmer} className="size-14 rounded-full" />
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4">
              <Bone shimmer={shimmer} className="h-14 rounded-xl" />
              <Bone shimmer={shimmer} className="h-14 rounded-xl" />
              <Bone shimmer={shimmer} className="h-14 rounded-xl" />
              <Bone shimmer={shimmer} className="h-14 rounded-xl" />
            </div>
          </div>
          <Bone shimmer={shimmer} className="h-72 rounded-2xl" />
        </>
      ) : null}

      {variant === "dashboard" || variant === "ledger" ? (
        <Bone shimmer={shimmer} className="h-80 rounded-xl" />
      ) : null}
    </motion.div>
  );
}
