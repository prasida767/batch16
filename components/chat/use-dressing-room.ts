"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessageView,
  type ChatPresencePayload,
} from "@/lib/chat/types";
import type { ChatRosterSeat } from "@/lib/chat/types";
import {
  makeTauntId,
  type TauntActionId,
  type TauntEvent,
} from "@/lib/chat/taunts";

type ChatOk = {
  kind: "ok";
  messages: ChatMessageView[];
  pinned: ChatMessageView[];
  gameweek: number;
  actingManagerId: number | null;
  roster?: ChatRosterSeat[];
  fetchedAt: string;
};

type BroadcastEvent =
  | { type: "message"; message: ChatMessageView }
  | { type: "reaction"; message: ChatMessageView }
  | { type: "pin"; message: ChatMessageView }
  | { type: "typing"; managerId: number; displayName: string }
  | { type: "taunt"; taunt: TauntEvent };

const TAUNT_TTL_MS = 3200;
const TAUNT_COOLDOWN_MS = 1200;

const SEEN_KEY = "batch16_dressing_room_seen";
const OPEN_KEY = "batch16_dressing_room_open";
const FALLBACK_POLL_MS = 8_000;
const BACKGROUND_POLL_MS = 90_000;

function upsertMessage(list: ChatMessageView[], message: ChatMessageView) {
  const idx = list.findIndex((m) => m.id === message.id);
  if (idx === -1) return [...list, message].sort((a, b) => a.id - b.id);
  const next = [...list];
  next[idx] = message;
  return next;
}

export function readChatOpen(): boolean {
  if (typeof window === "undefined") return false;
  const raw = window.localStorage.getItem(OPEN_KEY);
  if (raw == null) return false;
  return raw === "1";
}

export function writeChatOpen(open: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OPEN_KEY, open ? "1" : "0");
}

function readSeenId(): number {
  if (typeof window === "undefined") return 0;
  const n = Number(window.localStorage.getItem(SEEN_KEY));
  return Number.isInteger(n) && n > 0 ? n : 0;
}

function writeSeenId(id: number) {
  if (typeof window === "undefined" || id <= 0) return;
  window.localStorage.setItem(SEEN_KEY, String(id));
}

export function useDressingRoom(
  me: ChatPresencePayload | null,
  options?: { enabled?: boolean },
) {
  const enabled = options?.enabled !== false;
  const [messages, setMessages] = useState<ChatMessageView[]>([]);
  const [pinned, setPinned] = useState<ChatMessageView[]>([]);
  const [roster, setRoster] = useState<ChatRosterSeat[]>([]);
  const [gameweek, setGameweek] = useState<number | null>(null);
  const [actingManagerId, setActingManagerId] = useState<number | null>(null);
  const [online, setOnline] = useState<ChatPresencePayload[]>([]);
  const [typing, setTyping] = useState<{ managerId: number; displayName: string }[]>(
    [],
  );
  const [speakingIds, setSpeakingIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [taunts, setTaunts] = useState<TauntEvent[]>([]);
  const [hitReactions, setHitReactions] = useState<
    Record<number, TauntActionId>
  >({});

  const openRef = useRef(true);
  const seenRef = useRef(0);
  const lastIdRef = useRef(0);
  const typingTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const speakingTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const tauntTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const hitTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const lastTauntAt = useRef(0);
  const failStreak = useRef(0);

  openRef.current = panelOpen;

  const applyTaunt = useCallback((taunt: TauntEvent) => {
    setTaunts((prev) => {
      if (prev.some((t) => t.id === taunt.id)) return prev;
      return [...prev.slice(-11), taunt];
    });
    setHitReactions((prev) => ({
      ...prev,
      [taunt.toManagerId]: taunt.action,
    }));

    const existingHit = hitTimers.current.get(taunt.toManagerId);
    if (existingHit) clearTimeout(existingHit);
    hitTimers.current.set(
      taunt.toManagerId,
      setTimeout(() => {
        setHitReactions((prev) => {
          if (prev[taunt.toManagerId] !== taunt.action) return prev;
          const next = { ...prev };
          delete next[taunt.toManagerId];
          return next;
        });
        hitTimers.current.delete(taunt.toManagerId);
      }, TAUNT_TTL_MS),
    );

    const existingFloat = tauntTimers.current.get(taunt.id);
    if (existingFloat) clearTimeout(existingFloat);
    tauntTimers.current.set(
      taunt.id,
      setTimeout(() => {
        setTaunts((prev) => prev.filter((t) => t.id !== taunt.id));
        tauntTimers.current.delete(taunt.id);
      }, TAUNT_TTL_MS),
    );
  }, []);

  const markSpeaking = useCallback((managerId: number) => {
    setSpeakingIds((prev) =>
      prev.includes(managerId) ? prev : [...prev, managerId],
    );
    const existing = speakingTimers.current.get(managerId);
    if (existing) clearTimeout(existing);
    speakingTimers.current.set(
      managerId,
      setTimeout(() => {
        setSpeakingIds((prev) => prev.filter((id) => id !== managerId));
        speakingTimers.current.delete(managerId);
      }, 2800),
    );
  }, []);

  useEffect(() => {
    lastIdRef.current = Math.max(0, ...messages.map((m) => m.id));
  }, [messages]);

  const markSeen = useCallback((list: ChatMessageView[]) => {
    if (list.length === 0) return;
    const maxId = Math.max(...list.map((m) => m.id));
    if (maxId > seenRef.current) {
      seenRef.current = maxId;
      writeSeenId(maxId);
    }
    setUnread(0);
  }, []);

  const applyIncoming = useCallback(
    (message: ChatMessageView, kind: "message" | "reaction" | "pin") => {
      setMessages((prev) => upsertMessage(prev, message));
      if (kind === "message") {
        markSpeaking(message.managerId);
      }
      if (kind === "pin") {
        setPinned((prev) => {
          if (!message.pinned) {
            return prev.filter((m) => m.id !== message.id);
          }
          return upsertMessage(
            prev.filter((m) => m.id !== message.id),
            message,
          );
        });
      }
      if (
        kind === "message" &&
        !openRef.current &&
        message.id > seenRef.current &&
        message.managerId !== me?.managerId
      ) {
        setUnread((u) => u + 1);
      }
    },
    [markSpeaking, me?.managerId],
  );

  const broadcast = useCallback((_event: BroadcastEvent) => {
    // Poll-only: other clients pick up messages on the 8s interval.
  }, []);

  const load = useCallback(async (afterId?: number) => {
    if (!enabled) return;
    if (failStreak.current >= 4) return;
    try {
      const qs =
        afterId != null && afterId > 0 ? `?after=${afterId}` : "";
      const res = await fetch(`/api/chat${qs}`, { cache: "no-store" });
      const data = (await res.json()) as ChatOk | { kind: "error"; message: string };
      if (!res.ok || data.kind !== "ok") {
        failStreak.current += 1;
        setError(
          data.kind === "error" ? data.message : "Couldn't reach the Dressing Room.",
        );
        return;
      }
      failStreak.current = 0;
      setError(null);
      setGameweek(data.gameweek);
      setActingManagerId(data.actingManagerId);
      if (afterId) {
        setMessages((prev) => {
          let next = prev;
          for (const m of data.messages) next = upsertMessage(next, m);
          return next;
        });
      } else {
        setMessages(data.messages);
        setPinned(data.pinned);
        if (data.roster?.length) setRoster(data.roster);
        seenRef.current = readSeenId();
        if (openRef.current) {
          markSeen(data.messages);
        } else {
          const newer = data.messages.filter(
            (m) => m.id > seenRef.current && m.managerId !== me?.managerId,
          ).length;
          setUnread(newer);
        }
      }
    } catch {
      failStreak.current += 1;
      setError("Couldn't reach the Dressing Room.");
    } finally {
      setLoading(false);
    }
  }, [enabled, markSeen, me?.managerId]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setPanelOpen(readChatOpen());
    seenRef.current = readSeenId();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !panelOpen) {
      if (!panelOpen) setLoading(false);
      return;
    }
    void load();
  }, [enabled, panelOpen, load]);

  useEffect(() => {
    if (!enabled) return;
    writeChatOpen(panelOpen);
    if (panelOpen) {
      markSeen(messages);
    }
  }, [enabled, panelOpen, messages, markSeen]);

  // Poll while the Dressing Room is open (no free-tier Realtime sockets).
  useEffect(() => {
    if (!enabled || !panelOpen) return;

    let cancelled = false;
    let poll: number | undefined;

    const stopLive = () => {
      if (poll != null) {
        window.clearInterval(poll);
        poll = undefined;
      }
    };

    const startLive = () => {
      if (cancelled || poll != null) return;
      poll = window.setInterval(() => {
        if (document.visibilityState !== "visible") return;
        const last = lastIdRef.current;
        void load(last > 0 ? last : undefined);
      }, FALLBACK_POLL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        startLive();
        const last = lastIdRef.current;
        void load(last > 0 ? last : undefined);
      } else {
        stopLive();
      }
    };

    if (document.visibilityState === "visible") startLive();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      for (const t of typingTimers.current.values()) clearTimeout(t);
      typingTimers.current.clear();
      for (const t of speakingTimers.current.values()) clearTimeout(t);
      speakingTimers.current.clear();
      for (const t of tauntTimers.current.values()) clearTimeout(t);
      tauntTimers.current.clear();
      for (const t of hitTimers.current.values()) clearTimeout(t);
      hitTimers.current.clear();
      stopLive();
    };
  }, [enabled, panelOpen, load]);

  // Slow unread poll while the panel is closed (no realtime sockets).
  useEffect(() => {
    if (!enabled || panelOpen) return;

    const poll = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void load();
    }, BACKGROUND_POLL_MS);

    return () => window.clearInterval(poll);
  }, [enabled, panelOpen, load]);

  const sendTyping = useCallback(() => {
    if (!enabled || !me) return;
    broadcast({
      type: "typing",
      managerId: me.managerId,
      displayName: me.displayName,
    });
  }, [broadcast, enabled, me]);

  const sendMessage = useCallback(
    async (body: string, replyToId: number | null) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, replyToId }),
      });
      const data = (await res.json()) as
        | { kind: "ok"; message: ChatMessageView }
        | { kind: "error"; message: string };
      if (data.kind !== "ok") throw new Error(data.message);
      applyIncoming(data.message, "message");
      broadcast({ type: "message", message: data.message });
      markSeen([data.message]);
      return data.message;
    },
    [applyIncoming, broadcast, markSeen],
  );

  const react = useCallback(
    async (messageId: number, emoji: string) => {
      const res = await fetch("/api/chat/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, emoji }),
      });
      const data = (await res.json()) as
        | { kind: "ok"; message: ChatMessageView }
        | { kind: "error"; message: string };
      if (data.kind !== "ok") throw new Error(data.message);
      applyIncoming(data.message, "reaction");
      broadcast({ type: "reaction", message: data.message });
      return data.message;
    },
    [applyIncoming, broadcast],
  );

  const pin = useCallback(
    async (messageId: number) => {
      const res = await fetch("/api/chat/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
      });
      const data = (await res.json()) as
        | { kind: "ok"; message: ChatMessageView }
        | { kind: "error"; message: string };
      if (data.kind !== "ok") throw new Error(data.message);
      applyIncoming(data.message, "pin");
      broadcast({ type: "pin", message: data.message });
      return data.message;
    },
    [applyIncoming, broadcast],
  );

  const sendTaunt = useCallback(
    (input: {
      action: TauntActionId;
      toManagerId: number;
      toName: string;
    }): TauntEvent | null => {
      if (!enabled || !me) return null;
      const now = Date.now();
      if (now - lastTauntAt.current < TAUNT_COOLDOWN_MS) return null;
      if (input.toManagerId === me.managerId) return null;
      lastTauntAt.current = now;

      const taunt: TauntEvent = {
        id: makeTauntId(),
        action: input.action,
        fromManagerId: me.managerId,
        fromName: me.displayName,
        toManagerId: input.toManagerId,
        toName: input.toName,
        at: now,
      };
      applyTaunt(taunt);
      broadcast({ type: "taunt", taunt });
      // Persist a durable notification for the target (best-effort).
      void fetch("/api/notifications/taunt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: input.action,
          toManagerId: input.toManagerId,
          toName: input.toName,
        }),
      }).catch(() => undefined);
      return taunt;
    },
    [applyTaunt, broadcast, enabled, me],
  );

  return {
    messages,
    pinned,
    roster,
    gameweek,
    actingManagerId,
    online,
    typing,
    speakingIds,
    taunts,
    hitReactions,
    loading,
    error,
    unread,
    panelOpen,
    setPanelOpen,
    sendMessage,
    sendTyping,
    sendTaunt,
    react,
    pin,
    reload: () => load(),
  };
}
