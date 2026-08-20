"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  Flag,
  Gamepad2,
  Swords,
  Trophy,
  Users,
} from "lucide-react";
import {
  cancelChallengeAction,
  challengeManagerAction,
  loadPenaltiesBoardAction,
  multiplayerChoiceAction,
  refreshHistoryAction,
  refreshInboxAction,
  refreshMatchAction,
  respondChallengeAction,
  soloKickAction,
  startSoloAction,
} from "@/app/penalties/actions";
import dynamic from "next/dynamic";
import { AuthIdentityCard } from "@/components/auth/auth-identity-card";
import { ManagerAvatar } from "@/components/league/shared";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/page-transition";
import { ConfettiBurst } from "@/components/motion/confetti";
import { usePenaltyPresence } from "@/components/penalties/use-penalty-presence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ShootoutPitch = dynamic(
  () =>
    import("@/components/penalties/shootout-pitch").then((m) => m.ShootoutPitch),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-56 items-center justify-center rounded-2xl bg-emerald-950/40 text-sm text-emerald-100/70">
        Loading pitch…
      </div>
    ),
  },
);

const DirectionButtons = dynamic(
  () =>
    import("@/components/penalties/shootout-pitch").then(
      (m) => m.DirectionButtons,
    ),
  { ssr: false },
);
import { cn } from "@/lib/utils";
import type {
  PenaltyDirection,
  PenaltyHistoryRow,
  PenaltyLeaderboardRow,
  PenaltyMatchView,
  PenaltyRoundRecord,
} from "@/lib/penalties/types";
import { PENALTY_MODE, PENALTY_STATUS } from "@/lib/penalties/types";

type ManagerLite = {
  id: number;
  displayName: string;
  avatarUrl: string | null;
  supportedTeamId?: number | null;
  supportedTeamCode?: number | null;
  avatarVariant?: number | null;
  fplEntryId: number | null;
};

type AnimPhase = "idle" | "runup" | "dive" | "result";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function ScorePips({
  score,
  max,
  label,
}: {
  score: number;
  max: number;
  label: string;
}) {
  return (
    <div className="text-center">
      <p className="mb-1 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="flex justify-center gap-1">
        {Array.from({ length: max }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-2.5 rounded-full",
              i < score ? "bg-emerald-500" : "bg-muted",
            )}
          />
        ))}
      </div>
      <p className="mt-1 text-lg font-bold tabular-nums">{score}</p>
    </div>
  );
}

function OnlineDot({ online }: { online: boolean }) {
  if (!online) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300"
      title="Online now"
    >
      <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
      Online
    </span>
  );
}

export function PenaltiesLobby({
  actingManagerId,
  acting,
  signedIn = false,
}: {
  actingManagerId: number | null;
  acting: ManagerLite | null;
  signedIn?: boolean;
}) {
  const [presenceOn, setPresenceOn] = useState(false);
  const mePresence = useMemo(
    () =>
      presenceOn && acting
        ? {
            managerId: acting.id,
            displayName: acting.displayName,
            avatarUrl: acting.avatarUrl,
            onlineAt: Date.now(),
          }
        : null,
    [acting, presenceOn],
  );
  const { online } = usePenaltyPresence(mePresence);
  const onlineIds = useMemo(
    () => new Set(online.map((o) => o.managerId)),
    [online],
  );

  const [bootError, setBootError] = useState<string | null>(null);
  const [booting, setBooting] = useState(true);
  const [managers, setManagers] = useState<ManagerLite[]>([]);
  const [pending, setPending] = useState<PenaltyMatchView[]>([]);
  const [active, setActive] = useState<PenaltyMatchView[]>([]);
  const [history, setHistory] = useState<PenaltyHistoryRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<PenaltyLeaderboardRow[]>([]);
  const [mineOnly, setMineOnly] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [pendingAction, startTransition] = useTransition();

  const [match, setMatch] = useState<PenaltyMatchView | null>(null);
  const [animPhase, setAnimPhase] = useState<AnimPhase>("idle");
  const [animDive, setAnimDive] = useState<PenaltyDirection | null>(null);
  const [animShot, setAnimShot] = useState<PenaltyDirection | null>(null);
  const [animScored, setAnimScored] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [confettiKey, setConfettiKey] = useState<string | null>(null);
  const lastSeenRounds = useRef(0);
  const animatingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBooting(true);
      const data = await loadPenaltiesBoardAction();
      if (cancelled) return;
      if (data.kind !== "ok") {
        setBootError(
          data.kind === "error"
            ? data.message
            : "Database is not configured.",
        );
        setBooting(false);
        return;
      }
      setManagers(data.managers);
      setPending(data.pending);
      setActive(data.active);
      setHistory(data.history);
      setLeaderboard(data.leaderboard);
      if (data.active[0]) {
        setMatch(data.active[0]);
        lastSeenRounds.current = data.active[0].rounds.length;
      }
      setBootError(null);
      setBooting(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const playReveal = useCallback(async (round: PenaltyRoundRecord) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    setBusy(true);
    setAnimShot(round.shot);
    setAnimDive(null);
    setAnimScored(null);
    // 3-step run-up toward the ball
    setAnimPhase("runup");
    await sleep(980);
    // Kick + keeper dive + ball flight
    setAnimDive(round.dive);
    setAnimPhase("dive");
    await sleep(680);
    // Net ripple / save catch + banner
    setAnimScored(round.scored);
    setAnimPhase("result");
    await sleep(1400);
    setAnimPhase("idle");
    setAnimDive(null);
    setAnimShot(null);
    setAnimScored(null);
    await sleep(200);
    setBusy(false);
    animatingRef.current = false;
  }, []);

  const refreshInbox = useCallback(() => {
    startTransition(async () => {
      const inbox = await refreshInboxAction();
      setPending(inbox.pending);
      setActive(inbox.active);
      setMatch((current) => {
        if (!current) return current;
        if (current.status === PENALTY_STATUS.COMPLETED) return current;
        const fromActive = inbox.active.find((m) => m.id === current.id);
        return fromActive ?? current;
      });
    });
  }, []);

  useEffect(() => {
    if (!match) return;
    if (match.rounds.length <= lastSeenRounds.current) return;
    if (animatingRef.current) return;
    const last = match.rounds[match.rounds.length - 1]!;
    lastSeenRounds.current = match.rounds.length;
    void (async () => {
      await playReveal(last);
      if (match.status === PENALTY_STATUS.COMPLETED && match.winnerId === actingManagerId) {
        setConfettiKey(`win-${match.id}-${Date.now()}`);
        setShowConfetti(true);
      }
    })();
  }, [match, playReveal, actingManagerId]);

  // Poll lightly only while there is something to watch (pending/active match).
  useEffect(() => {
    if (!actingManagerId) return;
    const needsPoll = pending.length > 0 || active.length > 0 || match != null;
    if (!needsPoll) return;

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refreshInbox();
    }, 12_000);
    return () => window.clearInterval(id);
  }, [actingManagerId, pending.length, active.length, match, refreshInbox]);

  useEffect(() => {
    if (booting) return;
    startTransition(async () => {
      const rows = await refreshHistoryAction(mineOnly);
      setHistory(rows);
    });
  }, [mineOnly, booting]);

  if (booting) {
    return (
      <div className="h-80 animate-pulse rounded-2xl bg-muted/40" aria-busy />
    );
  }

  if (bootError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Couldn’t load Penalties</CardTitle>
          <CardDescription>
            {bootError}. Wait a moment and refresh — other pages should stay
            usable now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  function run(
    action: () => Promise<{ ok: boolean; message: string }>,
  ) {
    startTransition(async () => {
      const result = await action();
      setFlash(result.message);
      refreshInbox();
    });
  }

  function startSolo() {
    startTransition(async () => {
      setFlash("Starting solo match…");
      const result = await startSoloAction();
      setFlash(result.message);
      if (result.ok && result.match) {
        lastSeenRounds.current = result.match.rounds.length;
        setShowConfetti(false);
        setAnimPhase("idle");
        setAnimDive(null);
        setAnimShot(null);
        setAnimScored(null);
        setMatch(result.match);
        setActive((prev) => {
          const withoutOldSolo = prev.filter(
            (m) => !(m.mode === PENALTY_MODE.SOLO && m.status === PENALTY_STATUS.ACTIVE),
          );
          return [result.match!, ...withoutOldSolo];
        });
      }
    });
  }

  async function onSoloKick(choice: PenaltyDirection) {
    if (!match || busy) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("matchId", String(match.id));
    fd.set("choice", choice);
    const result = await soloKickAction(fd);
    if (!result.ok || !result.match || !result.lastRound) {
      setFlash(result.message);
      setBusy(false);
      return;
    }
    lastSeenRounds.current = result.match.rounds.length;
    await playReveal(result.lastRound);
    setMatch(result.match);
    if (result.match.status === PENALTY_STATUS.COMPLETED) {
      if (result.match.winnerId === actingManagerId) {
        setConfettiKey(`win-${result.match.id}-${Date.now()}`);
        setShowConfetti(true);
      }
      setFlash(
        result.match.winnerId === actingManagerId
          ? "You win the shootout!"
          : result.match.winnerId == null
            ? "Draw!"
            : "Computer wins — rematch?",
      );
      refreshInbox();
      const rows = await refreshHistoryAction(mineOnly);
      setHistory(rows);
    }
    setBusy(false);
  }

  async function onMultiChoice(choice: PenaltyDirection) {
    if (!match || busy || !actingManagerId) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("matchId", String(match.id));
    fd.set("choice", choice);
    const result = await multiplayerChoiceAction(fd);
    if (!result.ok || !result.match) {
      setFlash(result.message);
      setBusy(false);
      return;
    }

    // Round resolve triggers playReveal via useEffect when rounds grow
    setMatch(result.match);
    setFlash(result.message);
    if (result.match.status === PENALTY_STATUS.COMPLETED) {
      refreshInbox();
      const rows = await refreshHistoryAction(mineOnly);
      setHistory(rows);
    }
    setBusy(false);
  }

  const othersOnline = online.filter((o) => o.managerId !== actingManagerId);
  const iAmChallenger = match != null && match.challengerId === actingManagerId;
  const myChoiceLocked =
    match != null &&
    (iAmChallenger ? match.challengerChoice != null : match.opponentChoice != null);
  const waitingOpponent =
    match?.mode === PENALTY_MODE.MULTIPLAYER &&
    match.status === PENALTY_STATUS.ACTIVE &&
    myChoiceLocked &&
    (iAmChallenger ? match.opponentChoice == null : match.challengerChoice == null);

  const roleLabel =
    match?.mode === PENALTY_MODE.SOLO
      ? "Pick where to shoot"
      : match?.shooterId === actingManagerId
        ? "You’re shooting — pick a side"
        : match?.keeperId === actingManagerId
          ? "You’re in goal — pick a dive"
          : "Pick a direction";

  if (!acting) {
    return (
      <AuthIdentityCard
        actingName={null}
        context="challenges"
        signedIn={signedIn}
      />
    );
  }

  return (
    <div className="space-y-8">
      {showConfetti && confettiKey ? (
        <ConfettiBurst celebrationKey={confettiKey} />
      ) : null}

      <FadeIn>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Playing as{" "}
            <span className="font-semibold text-foreground">
              {acting.displayName}
            </span>
          </span>
          <OnlineDot online />
          {flash ? (
            <Badge variant="secondary" className="font-normal">
              {flash}
            </Badge>
          ) : null}
        </div>
      </FadeIn>

      {/* Online Now — opt-in (Realtime Presence is expensive on free tier) */}
      <FadeIn delay={0.04}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="size-4 text-primary" />
                  Online Now
                </CardTitle>
                <CardDescription>
                  Optional live presence — leave off unless you need to see who’s
                  here.
                </CardDescription>
              </div>
              <Button
                type="button"
                size="sm"
                variant={presenceOn ? "default" : "outline"}
                disabled={!acting}
                onClick={() => setPresenceOn((v) => !v)}
              >
                {presenceOn ? "Go offline" : "Go online"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!presenceOn ? (
              <p className="text-sm text-muted-foreground">
                You’re offline. Solo and challenges still work without live
                presence.
              </p>
            ) : othersOnline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                You’re the only one online. Start a solo shootout or wait for
                mates.
              </p>
            ) : (
              <Stagger className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {othersOnline.map((person) => (
                  <StaggerItem key={person.managerId}>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <ManagerAvatar
                          name={person.displayName}
                          src={person.avatarUrl}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {person.displayName}
                          </p>
                          <OnlineDot online />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pendingAction}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("opponentId", String(person.managerId));
                          run(async () => challengeManagerAction(fd));
                        }}
                      >
                        <Swords className="size-3.5" />
                        Challenge
                      </Button>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </CardContent>
        </Card>
      </FadeIn>

      {/* Inbox */}
      {(pending.length > 0 || active.length > 0) && (
        <FadeIn delay={0.06}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Challenges</CardTitle>
              <CardDescription>
                Accept, decline, or jump back into an active match.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {pending.map((row) => {
                const incoming = row.opponentId === actingManagerId;
                return (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 rounded-xl border border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <p className="text-sm">
                      {incoming ? (
                        <>
                          <span className="font-semibold">
                            {row.challengerName}
                          </span>{" "}
                          challenged you
                        </>
                      ) : (
                        <>
                          Waiting on{" "}
                          <span className="font-semibold">
                            {row.opponentName}
                          </span>
                        </>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {incoming ? (
                        <>
                          <Button
                            size="sm"
                            disabled={pendingAction}
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("matchId", String(row.id));
                              fd.set("accept", "true");
                              run(async () => {
                                const r = await respondChallengeAction(fd);
                                if (r.ok && r.matchId) {
                                  const m = await refreshMatchAction(r.matchId);
                                  if (m) {
                                    setMatch(m);
                                    lastSeenRounds.current = m.rounds.length;
                                  }
                                }
                                return r;
                              });
                            }}
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingAction}
                            onClick={() => {
                              const fd = new FormData();
                              fd.set("matchId", String(row.id));
                              fd.set("accept", "false");
                              run(async () => respondChallengeAction(fd));
                            }}
                          >
                            Decline
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pendingAction}
                          onClick={() => {
                            const fd = new FormData();
                            fd.set("matchId", String(row.id));
                            run(async () => cancelChallengeAction(fd));
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
              {active.map((row) => (
                <div
                  key={`a-${row.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-3"
                >
                  <p className="text-sm">
                    Active vs{" "}
                    <span className="font-semibold">
                      {row.challengerId === actingManagerId
                        ? row.opponentName
                        : row.challengerName}
                    </span>{" "}
                    · {row.challengerScore}–{row.opponentScore}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setMatch(row);
                      lastSeenRounds.current = row.rounds.length;
                      setShowConfetti(false);
                    }}
                  >
                    Resume
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {/* Game + solo start */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <FadeIn delay={0.08}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Gamepad2 className="size-4 text-primary" />
                {match
                  ? match.mode === PENALTY_MODE.SOLO
                    ? "Solo vs Computer"
                    : `vs ${match.challengerId === actingManagerId ? match.opponentName : match.challengerName}`
                  : "Penalty Shootout"}
              </CardTitle>
              <CardDescription>
                Best of 5 · Left / Center / Right · smooth reveals
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!match || match.status === PENALTY_STATUS.COMPLETED ? (
                <div className="space-y-4">
                  <ShootoutPitch
                    dive={null}
                    shot={null}
                    phase="idle"
                    scored={null}
                  />
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      disabled={pendingAction}
                      onClick={startSolo}
                    >
                      {pendingAction ? "Starting…" : "Play solo"}
                    </Button>
                  </div>
                  {match?.status === PENALTY_STATUS.COMPLETED ? (
                    <p className="text-center text-sm text-muted-foreground">
                      Final {match.challengerScore}–{match.opponentScore}
                      {match.winnerName
                        ? ` · ${match.winnerName} wins`
                        : " · Draw"}
                    </p>
                  ) : null}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-around gap-4">
                    <ScorePips
                      score={
                        match.challengerId === actingManagerId
                          ? match.challengerScore
                          : match.opponentScore
                      }
                      max={match.maxRounds}
                      label="You"
                    />
                    <div className="text-center">
                      <Badge variant="outline">
                        Round {match.currentRound}/{match.maxRounds}
                      </Badge>
                    </div>
                    <ScorePips
                      score={
                        match.challengerId === actingManagerId
                          ? match.opponentScore
                          : match.challengerScore
                      }
                      max={match.maxRounds}
                      label={
                        match.mode === PENALTY_MODE.SOLO
                          ? "Saves"
                          : "Them"
                      }
                    />
                  </div>

                  <ShootoutPitch
                    dive={animDive}
                    shot={animShot}
                    phase={animPhase}
                    scored={animScored}
                  />

                  {waitingOpponent ? (
                    <motion.p
                      className="text-center text-sm text-muted-foreground"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ repeat: Infinity, duration: 1.6 }}
                    >
                      Waiting for opponent to lock in…
                    </motion.p>
                  ) : (
                    <DirectionButtons
                      disabled={busy || pendingAction || myChoiceLocked}
                      onPick={(dir) => {
                        if (match.mode === PENALTY_MODE.SOLO) {
                          void onSoloKick(dir);
                        } else {
                          void onMultiChoice(dir);
                        }
                      }}
                      label={
                        myChoiceLocked
                          ? "Choice locked"
                          : roleLabel
                      }
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </FadeIn>

        {/* Leaderboard */}
        <FadeIn delay={0.1}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Trophy className="size-4 text-amber-500" />
                Shootout leaderboard
              </CardTitle>
              <CardDescription>
                Ranked by wins, then win rate, then games played.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No completed matches yet — be the first on the board.
                </p>
              ) : (
                <ul className="space-y-2">
                  {leaderboard.slice(0, 10).map((row) => (
                    <li
                      key={row.managerId}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-2 py-2",
                        row.rank <= 3 && "bg-amber-500/5",
                        row.managerId === actingManagerId && "ring-1 ring-primary/30",
                      )}
                    >
                      <span className="w-5 text-center text-xs font-bold tabular-nums text-muted-foreground">
                        {row.rank}
                      </span>
                      <ManagerAvatar
                        name={row.displayName}
                        src={row.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {row.displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {row.wins}W · {(row.winRate * 100).toFixed(0)}% ·{" "}
                          {row.gamesPlayed} played
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {/* Offline managers you can still challenge (optional light list) */}
      <FadeIn delay={0.12}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="size-4" />
              All managers
            </CardTitle>
            <CardDescription>
              Green = online now. Challenges work best when they’re here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {managers
                .filter((m) => m.id !== actingManagerId)
                .map((m) => {
                  const isOn = onlineIds.has(m.id);
                  return (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <ManagerAvatar
                          name={m.displayName}
                          src={m.avatarUrl}
                          supportedTeamId={m.supportedTeamId}
                          supportedTeamCode={m.supportedTeamCode}
                          avatarVariant={m.avatarVariant}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {m.displayName}
                          </p>
                          <OnlineDot online={isOn} />
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={isOn ? "default" : "outline"}
                        disabled={pendingAction}
                        onClick={() => {
                          const fd = new FormData();
                          fd.set("opponentId", String(m.id));
                          run(async () => challengeManagerAction(fd));
                        }}
                      >
                        Challenge
                      </Button>
                    </li>
                  );
                })}
            </ul>
          </CardContent>
        </Card>
      </FadeIn>

      {/* History */}
      <FadeIn delay={0.14}>
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-3">
            <div>
              <CardTitle className="text-base">Challenge history</CardTitle>
              <CardDescription>
                Opponent, score, winner, and date.
              </CardDescription>
            </div>
            <div className="flex gap-1 rounded-lg border border-border/60 p-0.5">
              <Button
                size="sm"
                variant={!mineOnly ? "secondary" : "ghost"}
                onClick={() => setMineOnly(false)}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={mineOnly ? "secondary" : "ghost"}
                onClick={() => setMineOnly(true)}
              >
                My challenges
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No matches yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-left text-[11px] tracking-wide text-muted-foreground uppercase">
                      <th className="py-2 pr-2 font-medium">Opponent</th>
                      <th className="py-2 pr-2 font-medium">Score</th>
                      <th className="py-2 pr-2 font-medium">Winner</th>
                      <th className="py-2 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-border/40 last:border-0"
                      >
                        <td className="py-2.5 pr-2">
                          <span className="font-medium">{row.opponentName}</span>
                          <span className="ml-1.5 text-[10px] text-muted-foreground uppercase">
                            {row.mode}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2 tabular-nums">
                          {row.myScore}–{row.theirScore}
                        </td>
                        <td className="py-2.5 pr-2">
                          {row.isDraw
                            ? "Draw"
                            : row.winnerName ?? "—"}
                          {row.iWon ? (
                            <Badge
                              variant="outline"
                              className="ml-1.5 border-emerald-500/30 text-[10px] text-emerald-700"
                            >
                              You
                            </Badge>
                          ) : null}
                        </td>
                        <td className="py-2.5 text-muted-foreground">
                          {new Date(
                            row.completedAt ?? row.createdAt,
                          ).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
