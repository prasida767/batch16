"use client";

import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Approximate the previous cubic-bezier(0.22, 1, 0.36, 1) ease-out. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

/**
 * Animate a number with rAF instead of framer-motion's `animate()`.
 * Avoids Turbopack interop bugs with `animate` (`null.default`).
 */
export function useTweenedNumber(value: number, duration = 0.85): number {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);
  const fromRef = useRef(reduce ? value : 0);
  const first = useRef(true);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    const from = first.current ? 0 : fromRef.current;
    first.current = false;
    const start = performance.now();
    const durationMs = Math.max(0, duration) * 1000;
    let frame = 0;

    const tick = (now: number) => {
      const t =
        durationMs <= 0 ? 1 : Math.min(1, (now - start) / durationMs);
      const next = from + (value - from) * easeOutExpo(t);
      setDisplay(next);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        setDisplay(value);
        fromRef.current = value;
      }
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return display;
}
