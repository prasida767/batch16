"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  easeOutSoft,
  slideInLeft,
  slideInRight,
  slideInUp,
} from "@/components/motion/variants";

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <motion.div
      key={pathname}
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: easeOutSoft }}
      className="min-w-0"
    >
      {children}
    </motion.div>
  );
}

type MotionWrapperProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** When true, only animate once into view (scroll). Default: animate on mount. */
  once?: boolean;
};

export function FadeIn({
  children,
  className,
  delay = 0,
  once = false,
}: MotionWrapperProps) {
  const reduce = useReducedMotion();

  if (once) {
    return (
      <motion.div
        className={className}
        initial={reduce ? false : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.42, delay, ease: easeOutSoft }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: easeOutSoft }}
    >
      {children}
    </motion.div>
  );
}

type SlideDirection = "up" | "left" | "right";

export function SlideIn({
  children,
  className,
  delay = 0,
  direction = "up",
  once = false,
}: MotionWrapperProps & { direction?: SlideDirection }) {
  const reduce = useReducedMotion();
  const variants =
    direction === "left"
      ? slideInLeft
      : direction === "right"
        ? slideInRight
        : slideInUp;

  if (once) {
    return (
      <motion.div
        className={className}
        initial={reduce ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, margin: "-40px" }}
        variants={{
          hidden: variants.hidden,
          show: {
            ...variants.show,
            transition: {
              ...(typeof variants.show.transition === "object"
                ? variants.show.transition
                : {}),
              delay,
            },
          },
        }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={reduce ? false : "hidden"}
      animate="show"
      variants={{
        hidden: variants.hidden,
        show: {
          ...variants.show,
          transition: {
            ...(typeof variants.show.transition === "object"
              ? variants.show.transition
              : {}),
            delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? "show" : "hidden"}
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.055, delayChildren: 0.04 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={
        reduce
          ? undefined
          : {
              hidden: { opacity: 0, y: 12 },
              show: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.38, ease: easeOutSoft },
              },
            }
      }
    >
      {children}
    </motion.div>
  );
}

/** Subtle hover lift for interactive cards / list rows. */
export function HoverLift({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="rest"
      whileHover={reduce ? undefined : "hover"}
      variants={{
        rest: { y: 0 },
        hover: {
          y: -2,
          transition: { duration: 0.2, ease: easeOutSoft },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
