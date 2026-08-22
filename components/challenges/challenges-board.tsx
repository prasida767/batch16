"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Check,
  LoaderCircle,
  Swords,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import {
  cancelChallengeAction,
  createChallengeAction,
  resolveChallengeAction,
  respondChallengeAction,
} from "@/app/challenges/actions";
import { AuthIdentityCard } from "@/components/auth/auth-identity-card";
import {
  playBaajiSound,
  readBaajiMute,
  writeBaajiMute,
} from "@/components/challenges/baaji-sounds";
import {
  FullTimeBanner,
  MatchMeta,
  MatchVersus,
  MuteToggle,
  StadiumShell,
  formatStake,
} from "@/components/challenges/stadium-match";
import { FadeIn } from "@/components/motion/page-transition";
import { easeOutSoft } from "@/components/motion/variants";
import type { ActionResult } from "@/lib/admin/shared";
import type { ChallengeView } from "@/lib/challenges/types";
import {
  CHALLENGE_ACTIVITY,
  CHALLENGE_STATUS,
  HIGH_STAKE_NPR,
  canMarkBaajiWinner,
  isHighStake,
} from "@/lib/challenges/types";
import { ManagerAvatar } from "@/components/league/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type ManagerOption = {
  id: number;
  displayName: string;
  fplEntryId: number | null;
  avatarUrl?: string | null;
  supportedTeamId?: number | null;
  supportedTeamCode?: number | null;
  avatarVariant?: number | null;
};

type ActionKind = "accept" | "decline" | "create" | "cancel" | "complete" | null;

type Celebration = {
  kind: "kickoff" | "win" | "highWin" | "create";
  title: string;
  subtitle?: string;
};

export function ChallengesBoard({
  actingManagerId,
  actingName,
  signedIn = false,
  managers,
  currentGameweek,
  awaitingYou,
  active,
  season,
}: {
  actingManagerId: number | null;
  actingName: string | null;
  signedIn?: boolean;
  managers: ManagerOption[];
  currentGameweek: number | null;
  awaitingYou: ChallengeView[];
  active: ChallengeView[];
  season: ChallengeView[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<ActionResult | null>(null);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const [muted, setMuted] = useState(false);
  const reduce = useReducedMotion();
  const seenCompleted = useRef<Set<number> | null>(null);

  useEffect(() => {
    setMuted(readBaajiMute());
  }, []);

  function run(
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
    kind: ActionKind = null,
    _challenge?: ChallengeView | null,
  ) {
    startTransition(async () => {
      try {
        const result = await action(formData);
        setFlash(result);
        if (result.ok) {
          if (kind === "accept") {
            playBaajiSound("kickoff", muted);
            setCelebration({
              kind: "kickoff",
              title: "Match kick-off!",
              subtitle: "The baaji is live — may the better FPL manager win.",
            });
          } else if (kind === "create") {
            playBaajiSound("create", muted);
            setCelebration({
              kind: "create",
              title: "Fixture posted",
              subtitle: "Waiting for your opponent to walk out of the tunnel.",
            });
          }
          router.refresh();
        }
      } catch {
        setFlash({
          ok: false,
          message: "Couldn't update that baaji. Try again.",
        });
      }
    });
  }

  useEffect(() => {
    if (!celebration) return;
    const t = window.setTimeout(
      () => setCelebration(null),
      celebration.kind === "highWin" ? 4200 : 2200,
    );
    return () => window.clearTimeout(t);
  }, [celebration]);

  // Celebrate newly completed baaji (after admin resolve + refresh), not historical ones.
  useEffect(() => {
    const completed = season.filter(
      (c) => c.status === CHALLENGE_STATUS.COMPLETED && c.winnerName,
    );
    if (seenCompleted.current == null) {
      seenCompleted.current = new Set(completed.map((c) => c.id));
      return;
    }
    for (const latest of completed) {
      if (seenCompleted.current.has(latest.id)) continue;
      seenCompleted.current.add(latest.id);
      const high = isHighStake(latest.stakeNpr);
      playBaajiSound(high ? "highWin" : "win", muted);
      setCelebration({
        kind: high ? "highWin" : "win",
        title: high ? "MEGA BAJI FULL-TIME" : "Full-time",
        subtitle: `${latest.winnerName} takes it${formatStake(latest.stakeNpr) ? ` · ${formatStake(latest.stakeNpr)}` : ""}`,
      });
      break;
    }
  }, [season, muted]);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Every baaji is a match day. Stakes are tracked only (NPR).
        </p>
        <MuteToggle
          muted={muted}
          onToggle={() => {
            setMuted((m) => {
              const next = !m;
              writeBaajiMute(next);
              return next;
            });
          }}
        />
      </div>

      {flash ? (
        <motion.p
          initial={reduce ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "rounded-xl border px-3.5 py-2.5 text-sm shadow-xs",
            flash.ok
              ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-200"
              : "border-destructive/30 bg-destructive/5",
          )}
        >
          {flash.message}
        </motion.p>
      ) : null}

      <CelebrationOverlay celebration={celebration} reduce={!!reduce} />

      {!actingName ? (
        <AuthIdentityCard
          actingName={actingName}
          signedIn={signedIn}
          context="challenges"
        />
      ) : null}

      <FadeIn>
        <CreateMatchTicket
          actingManagerId={actingManagerId}
          managers={managers}
          currentGameweek={currentGameweek}
          pending={pending}
          onCreate={(fd) => run(createChallengeAction, fd, "create")}
        />
      </FadeIn>

      {awaitingYou.length > 0 ? (
        <MatchSection
          title="Tunnel — awaiting you"
          description="Walk out and accept, or bottle it."
          items={awaitingYou}
          actingManagerId={actingManagerId}
          pending={pending}
          onAction={run}
          emphasize
        />
      ) : null}

      <MatchSection
        title="Live fixtures"
        description="Pending and active baaji across the league."
        empty="No open fixtures — post a match ticket above."
        items={active}
        actingManagerId={actingManagerId}
        pending={pending}
        onAction={run}
      />

      <MatchSection
        title="Season results"
        description="Full-time, declined, cancelled — the archive."
        empty="No baaji this season yet."
        items={season}
        actingManagerId={actingManagerId}
        pending={pending}
        onAction={run}
      />
    </div>
  );
}

function CelebrationOverlay({
  celebration,
  reduce,
}: {
  celebration: Celebration | null;
  reduce: boolean;
}) {
  const high = celebration?.kind === "highWin";

  return (
    <AnimatePresence>
      {celebration ? (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className={cn(
              "absolute inset-0",
              high ? "bg-black/55" : "bg-black/35",
            )}
          />
          {!reduce
            ? Array.from({ length: high ? 36 : 16 }, (_, i) => (
                <motion.span
                  key={i}
                  className={cn(
                    "absolute size-2 rounded-sm",
                    i % 3 === 0
                      ? "bg-amber-300"
                      : i % 3 === 1
                        ? "bg-emerald-300"
                        : "bg-rose-300",
                  )}
                  style={{
                    left: `${10 + (i * 7) % 80}%`,
                    top: `${20 + (i * 11) % 50}%`,
                  }}
                  initial={{ opacity: 1, y: 0, scale: 1 }}
                  animate={{
                    opacity: 0,
                    y: high ? [0, -80, 120] : [0, -40, 60],
                    rotate: 180,
                    scale: 0.4,
                  }}
                  transition={{ duration: high ? 2.2 : 1.4, ease: "easeOut" }}
                />
              ))
            : null}
          <motion.div
            className={cn(
              "relative z-10 mx-4 max-w-md rounded-2xl border px-6 py-5 text-center shadow-2xl backdrop-blur-md",
              high
                ? "border-amber-300/50 bg-gradient-to-b from-amber-500/40 to-emerald-950/90"
                : "border-white/20 bg-emerald-950/85",
            )}
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.35, ease: easeOutSoft }}
          >
            {celebration.kind === "kickoff" ? (
              <Zap className="mx-auto size-8 text-amber-300" />
            ) : (
              <Trophy
                className={cn(
                  "mx-auto",
                  high ? "size-10 text-amber-200" : "size-8 text-amber-300",
                )}
              />
            )}
            <p
              className={cn(
                "mt-3 font-[family-name:var(--font-display)] font-semibold text-white",
                high ? "text-3xl" : "text-2xl",
              )}
            >
              {celebration.title}
            </p>
            {celebration.subtitle ? (
              <p className="mt-2 text-sm text-white/70">{celebration.subtitle}</p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function CreateMatchTicket({
  actingManagerId,
  managers,
  currentGameweek,
  pending,
  onCreate,
}: {
  actingManagerId: number | null;
  managers: ManagerOption[];
  currentGameweek: number | null;
  pending: boolean;
  onCreate: (fd: FormData) => void;
}) {
  const reduce = useReducedMotion();
  const [opponentId, setOpponentId] = useState<number | null>(null);

  const opponents = managers.filter((m) => m.id !== actingManagerId);
  const me = managers.find((m) => m.id === actingManagerId) ?? null;
  const selected = opponents.find((m) => m.id === opponentId) ?? null;
  const canSubmit = Boolean(actingManagerId && opponentId);

  return (
    <StadiumShell status={CHALLENGE_STATUS.PENDING} immersive>
      <div className="relative flex flex-col gap-4 px-3 py-5 sm:px-6 sm:py-7">
        <div className="text-center">
          <p className="text-[10px] font-semibold tracking-[0.3em] text-amber-200/90 uppercase drop-shadow">
            Match ticket
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold text-white drop-shadow sm:text-3xl">
            Naya baaji
          </h2>
          <p className="mt-1 text-xs text-emerald-50/70">
            +{CHALLENGE_ACTIVITY.CREATE} activity · stakes ≥ NPR{" "}
            {HIGH_STAKE_NPR.toLocaleString()} get mega full-time
          </p>
        </div>

        {/* Kick-off preview on the pitch */}
        <div className="mx-auto flex w-full max-w-md items-center justify-center gap-3 sm:gap-5">
          <PitchManagerChip
            manager={me}
            label="You"
            fallbackName="You"
            align="right"
          />
          <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-[10px] font-black tracking-wider text-emerald-950 shadow-[0_0_18px_rgba(251,191,36,0.5)] ring-2 ring-white/50 sm:size-11 sm:text-[11px]">
            VS
          </span>
          <PitchManagerChip
            manager={selected}
            label={selected ? "Opponent" : "Pick one"}
            fallbackName="?"
            align="left"
            pulse={!selected}
          />
        </div>

        <form
          className="mx-auto w-full max-w-xl space-y-4 rounded-2xl border border-white/20 bg-emerald-950/55 p-3 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!opponentId) return;
            onCreate(new FormData(event.currentTarget));
            event.currentTarget.reset();
            setOpponentId(null);
          }}
        >
          <input type="hidden" name="opponentId" value={opponentId ?? ""} />

          <div className="space-y-2">
            <div className="flex items-end justify-between gap-2">
              <Label className="text-emerald-100/90">Pick your opponent</Label>
              {selected ? (
                <button
                  type="button"
                  className="text-[11px] font-medium text-amber-200/90 underline-offset-2 hover:underline"
                  onClick={() => setOpponentId(null)}
                  disabled={pending}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <OpponentAvatarPicker
              managers={opponents}
              selectedId={opponentId}
              disabled={pending || !actingManagerId}
              onSelect={(id) =>
                setOpponentId((prev) => (prev === id ? null : id))
              }
            />
            {!opponentId ? (
              <p className="text-center text-[11px] text-emerald-100/55">
                Tap a manager to challenge them
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-emerald-100/90">
              What&apos;s the baaji?
            </Label>
            <Input
              id="description"
              name="description"
              required
              minLength={3}
              placeholder="I will score more points than you this GW"
              disabled={pending || !actingManagerId}
              className="h-10 rounded-xl border-white/20 bg-black/40 text-white placeholder:text-white/35"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="stakeNpr" className="text-emerald-100/90">
                Stake (NPR)
              </Label>
              <Input
                id="stakeNpr"
                name="stakeNpr"
                type="number"
                min={0}
                step="100"
                placeholder="500"
                disabled={pending || !actingManagerId}
                className="h-10 rounded-xl border-white/20 bg-black/40 text-white placeholder:text-white/35"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="gameweek" className="text-emerald-100/90">
                Gameweek
              </Label>
              <Input
                id="gameweek"
                name="gameweek"
                type="number"
                min={1}
                max={38}
                placeholder={
                  currentGameweek != null ? `e.g. ${currentGameweek}` : "e.g. 1"
                }
                disabled={pending || !actingManagerId}
                className="h-10 rounded-xl border-white/20 bg-black/40 text-white placeholder:text-white/35"
              />
            </div>
          </div>
          <motion.div whileTap={reduce || pending ? undefined : { scale: 0.98 }}>
            <Button
              type="submit"
              size="lg"
              className="w-full bg-amber-400 text-emerald-950 hover:bg-amber-300 disabled:opacity-50"
              disabled={pending || !canSubmit}
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Swords className="size-4" />
              )}
              Baaji Hanne ho?
            </Button>
          </motion.div>
        </form>
      </div>
    </StadiumShell>
  );
}

function PitchManagerChip({
  manager,
  label,
  fallbackName,
  align,
  pulse,
}: {
  manager: ManagerOption | null;
  label: string;
  fallbackName: string;
  align: "left" | "right";
  pulse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" ? "flex-row-reverse text-right" : "text-left",
      )}
    >
      <div className="relative shrink-0">
        {pulse ? (
          <span className="absolute inset-0 animate-pulse rounded-full bg-white/20 blur-md" />
        ) : null}
        {manager ? (
          <ManagerAvatar
            name={manager.displayName}
            src={manager.avatarUrl}
            supportedTeamId={manager.supportedTeamId}
            supportedTeamCode={manager.supportedTeamCode}
            avatarVariant={manager.avatarVariant}
            size="lg"
            className="relative ring-2 ring-white/50"
          />
        ) : (
          <span className="relative inline-flex size-14 items-center justify-center rounded-full border border-dashed border-white/40 bg-black/30 text-lg font-bold text-white/50">
            {fallbackName}
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-white drop-shadow">
          {manager?.displayName.split(" ")[0] ?? fallbackName}
        </p>
        <p className="truncate text-[10px] text-emerald-100/65 uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

function OpponentAvatarPicker({
  managers,
  selectedId,
  disabled,
  onSelect,
}: {
  managers: ManagerOption[];
  selectedId: number | null;
  disabled?: boolean;
  onSelect: (id: number) => void;
}) {
  const reduce = useReducedMotion();

  if (managers.length === 0) {
    return (
      <p className="rounded-xl border border-white/15 bg-black/25 px-3 py-4 text-center text-sm text-white/60">
        No other managers linked yet.
      </p>
    );
  }

  return (
    <ul
      className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5"
      role="listbox"
      aria-label="Choose opponent"
    >
      {managers.map((manager) => {
        const selected = selectedId === manager.id;
        return (
          <li key={manager.id} role="option" aria-selected={selected}>
            <motion.button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(manager.id)}
              whileTap={reduce || disabled ? undefined : { scale: 0.96 }}
              className={cn(
                "flex w-full flex-col items-center gap-1.5 rounded-xl border px-1.5 py-2.5 transition-colors",
                selected
                  ? "border-amber-300/80 bg-amber-400/20 shadow-[0_0_20px_rgba(251,191,36,0.25)]"
                  : "border-white/10 bg-black/25 hover:border-white/25 hover:bg-black/40",
                disabled && "opacity-50",
              )}
            >
              <span className="relative">
                <ManagerAvatar
                  name={manager.displayName}
                  src={manager.avatarUrl}
                  supportedTeamId={manager.supportedTeamId}
                  supportedTeamCode={manager.supportedTeamCode}
                  avatarVariant={manager.avatarVariant}
                  size="md"
                  className={cn(
                    "ring-2 transition-shadow",
                    selected ? "ring-amber-300" : "ring-white/25",
                  )}
                />
                {selected ? (
                  <span className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full bg-amber-400 text-emerald-950 shadow">
                    <Check className="size-2.5" strokeWidth={3} />
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "w-full truncate text-center text-[10px] font-semibold sm:text-[11px]",
                  selected ? "text-amber-100" : "text-white/80",
                )}
              >
                {manager.displayName.split(" ")[0]}
              </span>
            </motion.button>
          </li>
        );
      })}
    </ul>
  );
}

function MatchSection({
  title,
  description,
  empty,
  items,
  actingManagerId,
  pending,
  onAction,
  emphasize = false,
}: {
  title: string;
  description?: string;
  empty?: string;
  items: ChallengeView[];
  actingManagerId: number | null;
  pending: boolean;
  emphasize?: boolean;
  onAction: (
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
    kind?: ActionKind,
    challenge?: ChallengeView | null,
  ) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {items.length === 0 ? (
        empty ? (
          <StadiumShell status={CHALLENGE_STATUS.CANCELLED} compact>
            <p className="px-4 py-10 text-center text-sm text-white/60">{empty}</p>
          </StadiumShell>
        ) : null
      ) : (
        <div className="space-y-4">
          {items.map((challenge, i) => (
            <motion.div
              key={`${title}-${challenge.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35, ease: easeOutSoft }}
            >
              <MatchCard
                challenge={challenge}
                actingManagerId={actingManagerId}
                pending={pending}
                onAction={onAction}
                emphasize={emphasize}
              />
            </motion.div>
          ))}
        </div>
      )}
    </section>
  );
}

function MatchCard({
  challenge,
  actingManagerId,
  pending,
  onAction,
  emphasize = false,
}: {
  challenge: ChallengeView;
  actingManagerId: number | null;
  pending: boolean;
  emphasize?: boolean;
  onAction: (
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
    kind?: ActionKind,
    challenge?: ChallengeView | null,
  ) => void;
}) {
  const reduce = useReducedMotion();
  const isOpponent = actingManagerId === challenge.opponentId;
  const isCreator = actingManagerId === challenge.creatorId;
  const canRespond =
    isOpponent && challenge.status === CHALLENGE_STATUS.PENDING;
  const canCancel =
    isCreator &&
    (challenge.status === CHALLENGE_STATUS.PENDING ||
      challenge.status === CHALLENGE_STATUS.ACCEPTED);
  const canComplete =
    challenge.status === CHALLENGE_STATUS.ACCEPTED &&
    canMarkBaajiWinner({
      actorId: actingManagerId,
      creatorId: challenge.creatorId,
      opponentId: challenge.opponentId,
    });
  const high = isHighStake(challenge.stakeNpr);
  const completed = challenge.status === CHALLENGE_STATUS.COMPLETED;
  const declined = challenge.status === CHALLENGE_STATUS.DECLINED;

  return (
    <StadiumShell
      status={challenge.status}
      highStake={high && completed}
      crazy={high && completed}
      className={cn(emphasize && "ring-2 ring-amber-400/40")}
    >
      <div className="space-y-4 px-2 py-4 sm:px-3 sm:py-5">
        <MatchMeta challenge={challenge} />
        <MatchVersus challenge={challenge} size="md" />

        <div className="mx-auto max-w-lg space-y-2 px-3 text-center">
          <p className="text-sm font-medium leading-snug text-white/90 sm:text-base">
            {challenge.description}
          </p>
          {declined ? (
            <p className="text-xs font-medium text-rose-200/90">
              {challenge.opponentName} darayo vs {challenge.creatorName}
            </p>
          ) : null}
          {completed && challenge.winnerName ? (
            <FullTimeBanner
              winnerName={challenge.winnerName}
              highStake={high}
            />
          ) : null}
          {challenge.status === CHALLENGE_STATUS.ACCEPTED ? (
            <p className="text-[11px] text-emerald-100/55">
              {canMarkBaajiWinner({
                actorId: actingManagerId,
                creatorId: challenge.creatorId,
                opponentId: challenge.opponentId,
              })
                ? "Match in play — pick a winner when it’s done"
                : "Match in play — either manager or admin can declare full-time"}
            </p>
          ) : null}
        </div>

        {(canRespond || canCancel || canComplete) && (
          <div className="flex flex-wrap items-center justify-center gap-2 border-t border-white/10 px-3 pt-3">
            {canRespond ? (
              <>
                <motion.form
                  whileTap={reduce || pending ? undefined : { scale: 0.97 }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const fd = new FormData(event.currentTarget);
                    fd.set("decision", "accept");
                    onAction(respondChallengeAction, fd, "accept", challenge);
                  }}
                >
                  <input type="hidden" name="challengeId" value={challenge.id} />
                  <Button
                    type="submit"
                    size="sm"
                    className="min-w-28 gap-1.5 bg-emerald-400 text-emerald-950 hover:bg-emerald-300"
                    disabled={pending}
                  >
                    {pending ? (
                      <LoaderCircle className="size-3.5 animate-spin" />
                    ) : (
                      <Check className="size-3.5" />
                    )}
                    Kick off
                  </Button>
                </motion.form>
                <motion.form
                  whileTap={reduce || pending ? undefined : { scale: 0.97 }}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const fd = new FormData(event.currentTarget);
                    fd.set("decision", "decline");
                    onAction(respondChallengeAction, fd, "decline", challenge);
                  }}
                >
                  <input type="hidden" name="challengeId" value={challenge.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="min-w-28 gap-1.5 border-white/25 bg-transparent text-white hover:bg-white/10"
                    disabled={pending}
                  >
                    <X className="size-3.5" />
                    Bottle it
                  </Button>
                </motion.form>
              </>
            ) : null}

            {canComplete ? (
              <form
                className="flex flex-wrap items-center justify-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  onAction(
                    resolveChallengeAction,
                    new FormData(event.currentTarget),
                    "complete",
                    challenge,
                  );
                }}
              >
                <input type="hidden" name="challengeId" value={challenge.id} />
                <select
                  name="winnerId"
                  required
                  disabled={pending}
                  defaultValue=""
                  className="h-8 rounded-lg border border-white/20 bg-black/40 px-2 text-xs text-white"
                >
                  <option value="" disabled>
                    Winner
                  </option>
                  <option value={challenge.creatorId}>
                    {challenge.creatorName}
                  </option>
                  <option value={challenge.opponentId}>
                    {challenge.opponentName}
                  </option>
                </select>
                <Button
                  type="submit"
                  size="sm"
                  className="gap-1.5 bg-amber-400 text-emerald-950 hover:bg-amber-300"
                  disabled={pending}
                >
                  {pending ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Trophy className="size-3.5" />
                  )}
                  Full-time
                </Button>
              </form>
            ) : null}

            {canCancel ? (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!window.confirm("Cancel this baaji?")) return;
                  onAction(
                    cancelChallengeAction,
                    new FormData(event.currentTarget),
                    "cancel",
                    challenge,
                  );
                }}
              >
                <input type="hidden" name="challengeId" value={challenge.id} />
                <Button
                  type="submit"
                  size="sm"
                  variant="ghost"
                  className="text-white/55 hover:bg-white/10 hover:text-white"
                  disabled={pending}
                >
                  Cancel fixture
                </Button>
              </form>
            ) : null}
          </div>
        )}
      </div>
    </StadiumShell>
  );
}
