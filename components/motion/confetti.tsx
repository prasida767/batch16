"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

type Particle = {
  id: number;
  x: number;
  rotate: number;
  color: string;
  size: number;
  delay: number;
  drift: number;
};

const COLORS = [
  "oklch(0.8 0.17 145)",
  "oklch(0.78 0.12 85)",
  "oklch(0.7 0.14 30)",
  "oklch(0.65 0.1 240)",
  "oklch(0.97 0.01 145)",
];

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.random() * 100,
    rotate: Math.random() * 360,
    color: COLORS[id % COLORS.length]!,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.25,
    drift: (Math.random() - 0.5) * 120,
  }));
}

/**
 * Short confetti burst. When `once` is true, fires once per celebrationKey
 * per browser session.
 */
export function ConfettiBurst({
  celebrationKey,
  enabled = true,
  once = true,
  count = 28,
}: {
  celebrationKey: string;
  enabled?: boolean;
  once?: boolean;
  count?: number;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(false);
  const particles = useMemo(() => makeParticles(count), [count]);

  useEffect(() => {
    if (!enabled || reduce || !celebrationKey) return;

    if (once) {
      const storageKey = `fpl-celebrate:${celebrationKey}`;
      try {
        if (sessionStorage.getItem(storageKey)) return;
        sessionStorage.setItem(storageKey, "1");
      } catch {
        // private mode
      }
    }

    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 2200);
    return () => window.clearTimeout(timer);
  }, [celebrationKey, enabled, once, reduce]);

  return (
    <AnimatePresence>
      {active ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          aria-hidden
        >
          {particles.map((p) => (
            <motion.span
              key={p.id}
              className="absolute top-0 rounded-sm"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
              }}
              initial={{ y: -20, x: 0, opacity: 1, rotate: p.rotate }}
              animate={{
                y: "110vh",
                x: p.drift,
                opacity: [1, 1, 0],
                rotate: p.rotate + 180,
              }}
              transition={{
                duration: 1.8 + Math.random() * 0.6,
                delay: p.delay,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          ))}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

type RainBit = {
  id: number;
  left: string;
  duration: number;
  delay: number;
  color: string;
  width: number;
  height: number;
};

/** Lightweight continuous confetti while an overlay is open. */
export function ConfettiRain({
  enabled = true,
  count = 14,
}: {
  enabled?: boolean;
  count?: number;
}) {
  const reduce = useReducedMotion();
  const bits = useMemo<RainBit[]>(
    () =>
      Array.from({ length: count }, (_, id) => ({
        id,
        left: `${6 + ((id * 17) % 88)}%`,
        duration: 3.2 + (id % 5) * 0.45,
        delay: (id % 7) * 0.35,
        color: COLORS[id % COLORS.length]!,
        width: 5 + (id % 3) * 2,
        height: 3 + (id % 2),
      })),
    [count],
  );

  if (!enabled || reduce) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      {bits.map((bit) => (
        <motion.span
          key={bit.id}
          className="absolute top-0 rounded-[1px]"
          style={{
            left: bit.left,
            width: bit.width,
            height: bit.height,
            backgroundColor: bit.color,
          }}
          animate={{
            y: ["-8%", "108%"],
            rotate: [0, 120 + bit.id * 20],
            opacity: [0, 0.85, 0.85, 0],
          }}
          transition={{
            duration: bit.duration,
            delay: bit.delay,
            repeat: Infinity,
            ease: "linear",
          }}
        />
      ))}
    </div>
  );
}
