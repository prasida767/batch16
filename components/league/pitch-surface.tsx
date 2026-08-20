"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Shared elegant football pitch surface (SVG markings + soft grass). */
export function PitchSurface({
  children,
  className,
  aspectClassName = "aspect-[5/7]",
  label,
}: {
  children?: ReactNode;
  className?: string;
  aspectClassName?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl shadow-card ring-1 ring-emerald-950/20 dark:ring-emerald-400/15",
        aspectClassName,
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(180deg,#1a7a45_0%,#16653a_45%,#124f2e_100%)]"
      />
      {/* Soft grass stripes */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0, transparent 11%, rgba(255,255,255,0.12) 11%, rgba(255,255,255,0.12) 22%)",
        }}
      />
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 140"
        preserveAspectRatio="none"
      >
        {/* Outer boundary */}
        <rect
          x="4"
          y="4"
          width="92"
          height="132"
          rx="1.5"
          fill="none"
          stroke="rgba(255,255,255,0.45)"
          strokeWidth="0.6"
        />
        {/* Halfway */}
        <line
          x1="4"
          y1="70"
          x2="96"
          y2="70"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.5"
        />
        {/* Center circle */}
        <circle
          cx="50"
          cy="70"
          r="12"
          fill="none"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="0.5"
        />
        <circle cx="50" cy="70" r="0.9" fill="rgba(255,255,255,0.55)" />
        {/* Top penalty area (opponent) */}
        <rect
          x="22"
          y="4"
          width="56"
          height="22"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.5"
        />
        <rect
          x="34"
          y="4"
          width="32"
          height="10"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.5"
        />
        <circle
          cx="50"
          cy="20"
          r="0.7"
          fill="rgba(255,255,255,0.5)"
        />
        {/* Bottom penalty area (own) */}
        <rect
          x="22"
          y="114"
          width="56"
          height="22"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.5"
        />
        <rect
          x="34"
          y="126"
          width="32"
          height="10"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="0.5"
        />
        <circle
          cx="50"
          cy="120"
          r="0.7"
          fill="rgba(255,255,255,0.5)"
        />
        {/* Goals */}
        <rect
          x="40"
          y="2.5"
          width="20"
          height="1.5"
          fill="rgba(255,255,255,0.35)"
        />
        <rect
          x="40"
          y="136"
          width="20"
          height="1.5"
          fill="rgba(255,255,255,0.35)"
        />
      </svg>

      {label ? (
        <p className="absolute top-2.5 left-3 z-20 rounded-md bg-black/25 px-2 py-0.5 text-[10px] font-medium tracking-wide text-white/90 uppercase backdrop-blur-sm">
          {label}
        </p>
      ) : null}

      <div className="relative z-10 h-full w-full">{children}</div>
    </div>
  );
}
