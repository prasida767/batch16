"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import {
  useDressingRoom,
} from "@/components/chat/use-dressing-room";
import type { ChatPresencePayload } from "@/lib/chat/types";

type DressingRoomApi = ReturnType<typeof useDressingRoom>;

const DressingRoomContext = createContext<DressingRoomApi | null>(null);

export function DressingRoomProvider({
  me,
  children,
}: {
  me: ChatPresencePayload | null;
  children: ReactNode;
}) {
  const api = useDressingRoom(me);
  return (
    <DressingRoomContext.Provider value={api}>
      {children}
    </DressingRoomContext.Provider>
  );
}

export function useDressingRoomContext() {
  const ctx = useContext(DressingRoomContext);
  if (!ctx) {
    throw new Error("useDressingRoomContext requires DressingRoomProvider");
  }
  return ctx;
}

export function useDressingRoomContextOptional() {
  return useContext(DressingRoomContext);
}
