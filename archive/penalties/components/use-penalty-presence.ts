"use client";

import { useEffect, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  PRESENCE_CHANNEL,
  type PresencePayload,
} from "@/lib/penalties/types";

export function usePenaltyPresence(me: PresencePayload | null) {
  const [online, setOnline] = useState<PresencePayload[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!me || !isSupabaseConfigured()) {
      setOnline([]);
      setReady(false);
      return;
    }

    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    function syncState(ch: RealtimeChannel) {
      const state = ch.presenceState();
      const map = new Map<number, PresencePayload>();
      for (const metas of Object.values(state)) {
        for (const raw of metas as unknown as PresencePayload[]) {
          if (raw?.managerId != null) {
            map.set(raw.managerId, raw);
          }
        }
      }
      setOnline(
        [...map.values()].sort((a, b) =>
          a.displayName.localeCompare(b.displayName),
        ),
      );
    }

    channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: String(me.managerId) } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        if (channel) syncState(channel);
      })
      .subscribe(async (status) => {
        if (cancelled || !channel) return;
        if (status === "SUBSCRIBED") {
          await channel.track({
            managerId: me.managerId,
            displayName: me.displayName,
            avatarUrl: me.avatarUrl,
            onlineAt: Date.now(),
          } satisfies PresencePayload);
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
      setReady(false);
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [me?.managerId, me?.displayName, me?.avatarUrl]);

  return { online, ready };
}
