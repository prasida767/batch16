"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  LoaderCircle,
  Maximize2,
  Minimize2,
  Pin,
  Reply,
  SendHorizontal,
  Shirt,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useDressingRoomContextOptional } from "@/components/chat/dressing-room-context";
import { DressingRoomScene } from "@/components/chat/dressing-room-scene";
import {
  playTauntSound,
  readDressingMute,
  writeDressingMute,
} from "@/components/chat/dressing-room-sounds";
import { useDressingRoom } from "@/components/chat/use-dressing-room";
import { ManagerAvatar } from "@/components/league/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { easeOutSoft } from "@/components/motion/variants";
import type { ChatRosterSeat } from "@/lib/chat/types";
import type { TauntActionId } from "@/lib/chat/taunts";
import {
  CHAT_BODY_MAX,
  REACTION_EMOJIS,
  type ChatMessageView,
  type ChatPresencePayload,
} from "@/lib/chat/types";
import { cn } from "@/lib/utils";

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function MessageBubble({
  message,
  mine,
  isAdmin,
  onReply,
  onReact,
  onPin,
  canInteract,
}: {
  message: ChatMessageView;
  mine: boolean;
  isAdmin: boolean;
  onReply: (m: ChatMessageView) => void;
  onReact: (id: number, emoji: string) => void;
  onPin: (id: number) => void;
  canInteract: boolean;
}) {
  const [picker, setPicker] = useState(false);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: easeOutSoft }}
      className={cn("group flex gap-2", mine ? "flex-row-reverse" : "flex-row")}
    >
      <ManagerAvatar
        name={message.managerName}
        src={message.avatarUrl}
        size="sm"
        supportedTeamId={message.supportedTeamId}
        supportedTeamCode={message.supportedTeamCode}
        avatarVariant={message.avatarVariant}
        animated={false}
      />
      <div
        className={cn(
          "max-w-[85%] space-y-1",
          mine ? "items-end text-right" : "items-start text-left",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap items-baseline gap-x-2 gap-y-0.5",
            mine && "justify-end",
          )}
        >
          <span className="text-[11px] font-semibold text-white/90">
            {mine ? "You" : message.managerName}
          </span>
          <span className="text-[10px] text-white/40">
            {formatTime(message.createdAt)}
          </span>
          {message.pinned ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-300">
              <Pin className="size-2.5" /> Pinned
            </span>
          ) : null}
        </div>

        {message.replyPreview ? (
          <div
            className={cn(
              "rounded-md border border-white/10 bg-white/5 px-2 py-1 text-left text-[11px] text-white/55",
              mine && "ml-auto",
            )}
          >
            <span className="font-medium text-white/75">
              {message.replyPreview.managerName}
            </span>
            <p className="line-clamp-2">{message.replyPreview.body}</p>
          </div>
        ) : null}

        <div
          className={cn(
            "rounded-2xl px-2.5 py-1.5 text-[13px] leading-relaxed",
            mine
              ? "rounded-tr-md bg-emerald-500 text-white"
              : "rounded-tl-md border border-white/10 bg-white/10 text-white",
            message.pinned && !mine && "border-amber-400/40 bg-amber-500/10",
          )}
        >
          {message.body}
        </div>

        {message.reactions.length > 0 ? (
          <div className={cn("flex flex-wrap gap-1", mine && "justify-end")}>
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => canInteract && onReact(message.id, r.emoji)}
                disabled={!canInteract}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors",
                  r.reactedByMe
                    ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                    : "border-white/15 bg-white/5 text-white/70 hover:bg-white/10",
                )}
              >
                <span>{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {canInteract || isAdmin ? (
        <div
          className={cn(
            "flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100",
            mine && "justify-end",
          )}
        >
          {canInteract ? (
            <>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] text-white/55 hover:bg-white/10 hover:text-white"
            onClick={() => onReply(message)}
          >
            <Reply className="size-3" />
            Reply
          </Button>
          <div className="relative">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-white/55 hover:bg-white/10 hover:text-white"
              onClick={() => setPicker((v) => !v)}
            >
              React
            </Button>
            <AnimatePresence>
              {picker ? (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className={cn(
                    "absolute z-10 flex gap-0.5 rounded-xl border border-white/15 bg-[#15201a] p-1 shadow-md",
                    mine ? "right-0" : "left-0",
                  )}
                >
                  {REACTION_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="rounded-lg px-1.5 py-1 text-sm hover:bg-white/10"
                      onClick={() => {
                        onReact(message.id, emoji);
                        setPicker(false);
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
            </>
          ) : null}
          {isAdmin ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-1.5 text-[10px] text-white/55 hover:bg-white/10 hover:text-white"
              onClick={() => onPin(message.id)}
            >
              <Pin className="size-3" />
              {message.pinned ? "Unpin" : "Pin"}
            </Button>
          ) : null}
        </div>
        ) : null}
      </div>
    </motion.article>
  );
}

function ChatCentre({
  managerId,
  isAdmin,
  api,
  headerExtra,
  muted,
  onToggleMute,
  draft,
  setDraft,
  roastHint,
}: {
  managerId: number | null;
  isAdmin?: boolean;
  api: ReturnType<typeof useDressingRoom>;
  headerExtra?: ReactNode;
  muted: boolean;
  onToggleMute: () => void;
  draft: string;
  setDraft: (v: string) => void;
  roastHint: string | null;
}) {
  const reduce = useReducedMotion();
  const {
    messages,
    pinned,
    gameweek,
    actingManagerId,
    online,
    typing,
    loading,
    error,
    sendMessage,
    sendTyping,
    react,
    pin,
  } = api;

  const [replyTo, setReplyTo] = useState<ChatMessageView | null>(null);
  const [pending, setPending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const canPost = managerId != null || actingManagerId != null;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length, typing.length]);

  async function onSubmit(e?: FormEvent) {
    e?.preventDefault();
    if (!canPost || pending) return;
    const body = draft.trim();
    if (!body) return;
    setPending(true);
    setLocalError(null);
    try {
      await sendMessage(body, replyTo?.id ?? null);
      setDraft("");
      setReplyTo(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void onSubmit();
    }
  }

  const typingLabel =
    typing.length === 0
      ? null
      : typing.length === 1
        ? `${typing[0]!.displayName} is typing…`
        : `${typing.length} managers typing…`;

  const onlineCount = online.length;

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 opacity-[0.04]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.35) 2px, rgba(0,0,0,0.35) 3px)",
        }}
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-emerald-500/20 bg-gradient-to-b from-[#12201a] to-transparent px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </span>
            <Shirt className="size-3.5 text-emerald-300/90" />
            <h2 className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-wide text-emerald-50">
              Banter Board
            </h2>
          </div>
          <p className="mt-0.5 font-mono text-[10px] tracking-wide text-emerald-200/45">
            {gameweek != null ? `GW${gameweek}` : "LIVE"}
            {onlineCount > 0 ? ` · ${onlineCount} ONLINE` : " · STANDBY"}
            <span className="text-emerald-200/30"> · uncensorable</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-white/55 hover:bg-white/10 hover:text-white"
            onClick={onToggleMute}
            aria-label={muted ? "Unmute sounds" : "Mute sounds"}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? (
              <VolumeX className="size-3.5" />
            ) : (
              <Volume2 className="size-3.5" />
            )}
          </Button>
          {headerExtra}
        </div>
      </header>

      {pinned.length > 0 ? (
        <div className="relative z-10 shrink-0 space-y-1 border-b border-amber-400/20 bg-amber-500/10 px-2.5 py-1.5">
          {pinned.slice(0, 2).map((p) => (
            <div key={p.id} className="flex gap-1.5 text-[11px] text-amber-50/90">
              <Pin className="mt-0.5 size-2.5 shrink-0 text-amber-300" />
              <p className="line-clamp-1">
                <span className="font-semibold">{p.managerName}</span> · {p.body}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <div
        ref={listRef}
        className="relative z-10 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-2.5 py-2"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center gap-2 text-xs text-white/45">
            <LoaderCircle className="size-3.5 animate-spin" />
            Opening the tunnel…
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 px-4 text-center">
            <p className="text-xs font-medium text-white/70">
              Centre of the room is quiet.
            </p>
            <p className="text-[10px] text-white/40">
              Strong language welcome — keep it fun.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                mine={m.managerId === (actingManagerId ?? managerId)}
                isAdmin={Boolean(isAdmin)}
                canInteract={canPost}
                onReply={setReplyTo}
                onReact={(id, emoji) => {
                  void react(id, emoji).catch((err) =>
                    setLocalError(
                      err instanceof Error ? err.message : "Reaction failed.",
                    ),
                  );
                }}
                onPin={(id) => {
                  void pin(id).catch((err) =>
                    setLocalError(
                      err instanceof Error ? err.message : "Pin failed.",
                    ),
                  );
                }}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="relative z-10 shrink-0 border-t border-emerald-500/15 bg-gradient-to-t from-[#0c1612] to-transparent px-2.5 py-2.5">
        {roastHint ? (
          <p className="mb-1.5 rounded-md border border-orange-500/30 bg-orange-950/50 px-2 py-1 text-[10px] font-medium text-orange-100">
            {roastHint}
          </p>
        ) : null}
        {typingLabel ? (
          <motion.p
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-1 font-mono text-[10px] text-emerald-300/80"
          >
            {typingLabel}
          </motion.p>
        ) : null}

        {replyTo ? (
          <div className="mb-1.5 flex items-start justify-between gap-2 rounded-md border border-emerald-500/20 bg-emerald-950/40 px-2 py-1 text-[11px] text-white/80">
            <div className="min-w-0">
              <p className="font-medium text-emerald-200">
                Replying to {replyTo.managerName}
              </p>
              <p className="line-clamp-1 text-white/50">{replyTo.body}</p>
            </div>
            <button
              type="button"
              className="shrink-0 text-white/45 hover:text-white"
              onClick={() => setReplyTo(null)}
            >
              ✕
            </button>
          </div>
        ) : null}

        {(error || localError) && (
          <p className="mb-1 text-[10px] text-red-300">
            {localError ?? error}
          </p>
        )}

        <form onSubmit={onSubmit} className="flex items-center gap-1.5">
          <Input
            id="dressing-room-composer"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              sendTyping();
            }}
            onKeyDown={onKeyDown}
            disabled={!canPost || pending}
            placeholder={
              canPost
                ? "Banter, curses, roasts — go on…"
                : "Verify to join"
            }
            maxLength={CHAT_BODY_MAX}
            className="h-9 border-emerald-500/20 bg-[#0a1410] text-sm text-emerald-50 placeholder:text-emerald-200/30 focus-visible:ring-emerald-400/35"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canPost || pending || !draft.trim()}
            className="size-9 shrink-0 bg-emerald-500 text-[#04120c] shadow-[0_0_12px_rgba(16,185,129,0.35)] hover:bg-emerald-400"
          >
            {pending ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <SendHorizontal className="size-3.5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}

function PanelBody({
  managerId,
  isAdmin,
  onClose,
  className,
  api,
  immersive,
  onToggleFullscreen,
}: {
  managerId: number | null;
  isAdmin?: boolean;
  onClose?: () => void;
  className?: string;
  api: ReturnType<typeof useDressingRoom>;
  immersive?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const {
    roster,
    online,
    typing,
    speakingIds,
    actingManagerId,
    taunts,
    hitReactions,
    sendTaunt,
  } = api;
  const [drafting, setDrafting] = useState(false);
  const [selectedSeatId, setSelectedSeatId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [roastHint, setRoastHint] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const lastSoundId = useRef<string | null>(null);

  useEffect(() => {
    setMuted(readDressingMute());
  }, []);

  useEffect(() => {
    if (selectedSeatId == null) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") setSelectedSeatId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSeatId]);

  const onlineIds = useMemo(
    () => new Set(online.map((o) => o.managerId)),
    [online],
  );
  const typingIds = useMemo(() => {
    const ids = new Set(typing.map((t) => t.managerId));
    if (drafting && managerId != null) ids.add(managerId);
    return ids;
  }, [typing, managerId, drafting]);
  const speaking = useMemo(() => new Set(speakingIds), [speakingIds]);

  const wrappedApi = useMemo(() => {
    return {
      ...api,
      sendTyping: () => {
        setDrafting(true);
        api.sendTyping();
        window.setTimeout(() => setDrafting(false), 2000);
      },
    };
  }, [api]);

  useEffect(() => {
    if (taunts.length === 0) return;
    const latest = taunts[taunts.length - 1]!;
    if (latest.id === lastSoundId.current) return;
    lastSoundId.current = latest.id;
    playTauntSound(latest.action, muted);
  }, [taunts, muted]);

  function handleTaunt(action: TauntActionId, seat: ChatRosterSeat) {
    const sent = sendTaunt({
      action,
      toManagerId: seat.managerId,
      toName: seat.displayName,
    });
    if (!sent) return;
    setSelectedSeatId(null);

    if (action === "roast") {
      const first = seat.displayName.split(" ")[0] ?? seat.displayName;
      setDraft(`@${first} `);
      setRoastHint(
        `Roast ${first} — no filter, make it hurt (keep it league banter).`,
      );
      window.setTimeout(() => {
        document.getElementById("dressing-room-composer")?.focus();
      }, 80);
    }
  }

  return (
    <DressingRoomScene
      roster={roster}
      onlineIds={onlineIds}
      typingIds={typingIds}
      speakingIds={speaking}
      currentManagerId={actingManagerId ?? managerId}
      hitReactions={hitReactions}
      taunts={taunts}
      selectedSeatId={selectedSeatId}
      onSelectSeat={setSelectedSeatId}
      onTaunt={handleTaunt}
      canTaunt={managerId != null}
      immersive={immersive}
      className={className}
    >
      <ChatCentre
        managerId={managerId}
        isAdmin={isAdmin}
        api={wrappedApi}
        muted={muted}
        onToggleMute={() => {
          setMuted((m) => {
            const next = !m;
            writeDressingMute(next);
            return next;
          });
        }}
        draft={draft}
        setDraft={(v) => {
          setDraft(v);
          if (roastHint && !v.trim()) setRoastHint(null);
        }}
        roastHint={roastHint}
        headerExtra={
          <div className="flex items-center gap-0.5">
            {onToggleFullscreen ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-7 gap-1 border border-emerald-400/30 bg-emerald-500/20 px-2 text-[10px] font-semibold text-emerald-50 hover:bg-emerald-500/35 hover:text-white"
                onClick={onToggleFullscreen}
                aria-label={immersive ? "Exit full screen" : "Full screen"}
                title={immersive ? "Exit full screen" : "Full screen"}
              >
                {immersive ? (
                  <Minimize2 className="size-3" />
                ) : (
                  <Maximize2 className="size-3" />
                )}
                {immersive ? "Exit" : "Expand"}
              </Button>
            ) : null}
            {onClose ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-white/60 hover:bg-white/10 hover:text-white"
                onClick={onClose}
              >
                Close
              </Button>
            ) : null}
          </div>
        }
      />
    </DressingRoomScene>
  );
}

export function DressingRoomPanel({
  managerId,
  managerName,
  avatarUrl,
  isAdmin,
  className,
  onClose,
  immersive,
  onToggleFullscreen,
}: {
  managerId: number | null;
  managerName: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  className?: string;
  compactHeader?: boolean;
  onClose?: () => void;
  immersive?: boolean;
  onToggleFullscreen?: () => void;
}) {
  const shared = useDressingRoomContextOptional();
  const me: ChatPresencePayload | null =
    managerId != null && managerName
      ? {
          managerId,
          displayName: managerName,
          avatarUrl: avatarUrl ?? null,
          onlineAt: Date.now(),
        }
      : null;
  const standalone = useDressingRoom(me, { enabled: !shared });
  const api = shared ?? standalone;

  return (
    <PanelBody
      managerId={managerId}
      isAdmin={isAdmin}
      onClose={onClose}
      className={className}
      api={api}
      immersive={immersive}
      onToggleFullscreen={onToggleFullscreen}
    />
  );
}
