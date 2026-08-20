"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import type { ClubAvatarSpec } from "@/lib/avatars/clubs";
import { usePageVisible } from "@/lib/hooks/use-page-visible";
import { initials } from "@/lib/league/format";
import { cn } from "@/lib/utils";

const SIZE = {
  sm: "size-8",
  md: "size-10",
  lg: "size-14",
  xl: "size-20",
} as const;

/**
 * Club-coloured avatar. Uses short-name monogram instead of PL CDN crests
 * (resources.premierleague.com often returns 403 / broken images in-browser).
 */
export function ClubAvatar({
  spec,
  size = "md",
  className,
  animated = true,
}: {
  spec: ClubAvatarSpec;
  size?: keyof typeof SIZE;
  className?: string;
  animated?: boolean;
}) {
  const reduce = useReducedMotion();
  const visible = usePageVisible();
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const live = animated && !reduce && visible && !isNarrow;
  const dim = SIZE[size];
  const monogram =
    spec.shortName?.slice(0, 3).toUpperCase() ||
    spec.name.slice(0, 2).toUpperCase();

  // Prefer dark text on light secondary kits (e.g. City sky blue)
  const textOnLight = isLightColor(spec.primary);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white/35",
        dim,
        className,
      )}
      style={{
        background: `linear-gradient(145deg, ${spec.primary}, color-mix(in srgb, ${spec.primary} 55%, ${spec.secondary}))`,
        boxShadow: `0 0 0 1px color-mix(in srgb, ${spec.primary} 40%, transparent), 0 4px 12px color-mix(in srgb, ${spec.primary} 35%, transparent)`,
      }}
      title={spec.name}
    >
      <span
        className="absolute inset-0 opacity-35"
        style={{
          background: `radial-gradient(circle at 30% 25%, ${spec.secondary}, transparent 55%)`,
        }}
      />

      <VariantFx
        variant={spec.variant}
        primary={spec.primary}
        secondary={spec.secondary}
        live={live}
      />

      <span
        className={cn(
          "relative z-[2] font-black tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]",
          textOnLight ? "text-emerald-950" : "text-white",
          size === "sm"
            ? "text-[8px]"
            : size === "md"
              ? "text-[10px]"
              : size === "lg"
                ? "text-xs"
                : "text-sm",
        )}
      >
        {monogram}
      </span>
    </span>
  );
}

/** Photo URL with initials fallback when the image fails to load. */
export function PhotoAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = Boolean(src) && !failed;

  if (!showPhoto) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-semibold text-primary ring-1 ring-primary/10",
          className,
        )}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-block overflow-hidden rounded-full ring-1 ring-border",
        className,
      )}
    >
      <Image
        src={src!}
        alt=""
        fill
        sizes="80px"
        className="object-cover"
        unoptimized
        onError={() => setFailed(true)}
      />
    </span>
  );
}

function isLightColor(hex: string) {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return false;
  const r = Number.parseInt(raw.slice(0, 2), 16);
  const g = Number.parseInt(raw.slice(2, 4), 16);
  const b = Number.parseInt(raw.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  // Relative luminance shortcut
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

function VariantFx({
  variant,
  primary,
  secondary,
  live,
}: {
  variant: number;
  primary: string;
  secondary: string;
  live: boolean;
}) {
  if (!live) {
    return (
      <span
        className="absolute inset-[10%] rounded-full border border-white/25"
        aria-hidden
      />
    );
  }

  switch (variant % 8) {
    case 0:
      return (
        <motion.span
          aria-hidden
          className="absolute inset-[6%] rounded-full border-2"
          style={{ borderColor: secondary }}
          animate={{ scale: [1, 1.08, 1], opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        />
      );
    case 1:
      return (
        <motion.span
          aria-hidden
          className="absolute inset-0"
          animate={{ rotate: 360 }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "linear" }}
        >
          {[0, 120, 240].map((deg) => (
            <span
              key={deg}
              className="absolute top-1/2 left-1/2 size-1.5 rounded-full"
              style={{
                backgroundColor: secondary,
                transform: `rotate(${deg}deg) translateX(11px) translateY(-50%)`,
              }}
            />
          ))}
        </motion.span>
      );
    case 2:
      return (
        <motion.span
          aria-hidden
          className="absolute inset-[8%] rounded-full border border-dashed border-white/70"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
      );
    case 3:
      return (
        <motion.span
          aria-hidden
          className="absolute inset-0"
          style={{
            background: `linear-gradient(110deg, transparent 35%, ${secondary}99 50%, transparent 65%)`,
          }}
          animate={{ x: ["-60%", "60%"] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        />
      );
    case 4:
      return (
        <>
          <motion.span
            aria-hidden
            className="absolute inset-[10%] rounded-full border"
            style={{ borderColor: secondary }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <motion.span
            aria-hidden
            className="absolute inset-[18%] rounded-full border border-white/40"
            animate={{ rotate: -360 }}
            transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          />
        </>
      );
    case 5:
      return (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{ boxShadow: `inset 0 0 12px ${primary}` }}
          animate={{
            boxShadow: [
              `inset 0 0 8px ${primary}`,
              `inset 0 0 18px ${secondary}`,
              `inset 0 0 8px ${primary}`,
            ],
          }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      );
    case 6:
      return (
        <motion.span
          aria-hidden
          className="absolute inset-[12%] rounded-[28%] border-2 border-white/50"
          animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.04, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      );
    default:
      return (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute size-1 rounded-full bg-white"
              style={{
                top: `${18 + (i % 2) * 55}%`,
                left: `${18 + Math.floor(i / 2) * 55}%`,
              }}
              animate={{ opacity: [0.2, 1, 0.2], scale: [0.6, 1.2, 0.6] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                delay: i * 0.25,
                ease: "easeInOut",
              }}
            />
          ))}
        </>
      );
  }
}

export function AvatarVariantPicker({
  teamId,
  clubs,
  value,
  onChange,
}: {
  teamId: number;
  clubs: import("@/lib/avatars/clubs").ClubDefinition[];
  value: number;
  onChange: (variant: number) => void;
}) {
  const club = clubs.find((c) => c.id === teamId);
  if (!club) return null;

  return (
    <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
      {Array.from({ length: 8 }, (_, variant) => {
        const spec = {
          teamId: club.id,
          variant,
          code: club.code,
          primary: club.primary,
          secondary: club.secondary,
          shortName: club.shortName,
          name: club.name,
        };
        const selected = value === variant;
        return (
          <button
            key={variant}
            type="button"
            onClick={() => onChange(variant)}
            className={cn(
              "rounded-xl p-1.5 transition ring-offset-2 ring-offset-background",
              selected
                ? "ring-2 ring-primary bg-primary/10"
                : "hover:bg-muted/60",
            )}
            aria-label={`Avatar style ${variant + 1}`}
            aria-pressed={selected}
          >
            <ClubAvatar spec={spec} size="md" />
          </button>
        );
      })}
    </div>
  );
}
