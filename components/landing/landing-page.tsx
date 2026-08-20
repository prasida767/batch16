"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Batch16Mark } from "@/components/brand/batch16-mark";
import { buttonVariants } from "@/components/ui/button";
import { easeOutSoft } from "@/components/motion/variants";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "League table",
    copy: "Rank, points, weekly wins, and prize balance in one view.",
  },
  {
    title: "Live match centre",
    copy: "GW points, risers, and fallers while fixtures are on.",
  },
  {
    title: "Baaji & chat",
    copy: "Side bets plus a live chat bubble on League, Live, and Baaji.",
  },
] as const;

export function LandingPage({ nextPath }: { nextPath?: string | null }) {
  const reduce = useReducedMotion();
  const registerHref = nextPath
    ? `/auth/register?next=${encodeURIComponent(nextPath)}`
    : "/auth/register";
  const loginHref = nextPath
    ? `/auth/login?next=${encodeURIComponent(nextPath)}`
    : "/auth/login";

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 90% 70% at 50% -10%, color-mix(in oklch, var(--primary) 28%, transparent), transparent 55%), radial-gradient(ellipse 60% 50% at 100% 80%, color-mix(in oklch, #0ea5e9 12%, transparent), transparent 50%), linear-gradient(180deg, color-mix(in oklch, var(--background) 40%, transparent), var(--background))",
        }}
      />
      <div
        aria-hidden
        className="pitch-lines pointer-events-none absolute inset-0 -z-10 opacity-[0.14] dark:opacity-[0.2]"
      />

      <section className="flex min-h-[calc(100vh-4rem)] flex-col justify-center py-10 sm:py-14">
        <motion.p
          className="font-[family-name:var(--font-display)] text-xs font-semibold tracking-[0.28em] text-primary uppercase"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOutSoft }}
        >
          Private league HQ
        </motion.p>

        <motion.div
          className="mt-4 flex items-center gap-4"
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.06, ease: easeOutSoft }}
        >
          <Batch16Mark className="size-14 sm:size-16 md:size-[4.5rem]" />
          <h1 className="font-[family-name:var(--font-display)] text-5xl leading-[0.95] font-semibold tracking-tight sm:text-6xl md:text-7xl">
            Batch 16
          </h1>
        </motion.div>

        <motion.p
          className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14, ease: easeOutSoft }}
        >
          Live standings, the prize pot, weekly winners, Baaji, and chat — one
          place for our FPL season.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap items-center gap-3"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: easeOutSoft }}
        >
          <Link
            href={registerHref}
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 px-5 font-semibold",
            )}
          >
            Join with email
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href={loginHref}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-5")}
          >
            Sign in
          </Link>
        </motion.div>

        <motion.p
          className="mt-4 text-xs text-muted-foreground"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.35 }}
        >
          Members only — register, then verify your name and FPL team.
        </motion.p>
      </section>

      <motion.section
        className="border-t border-border/60 py-12 sm:py-14"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 0.5, ease: easeOutSoft }}
      >
        <p className="text-sm font-medium text-muted-foreground">Inside the app</p>
        <ul className="mt-6 grid gap-8 sm:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.li
              key={feature.title}
              initial={reduce ? false : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.4,
                delay: index * 0.08,
                ease: easeOutSoft,
              }}
            >
              <p className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                {feature.title}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.copy}
              </p>
            </motion.li>
          ))}
        </ul>
      </motion.section>
    </div>
  );
}
