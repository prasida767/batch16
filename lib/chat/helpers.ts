import { HALL_OF_FAME_MIN_REACTIONS } from "@/lib/chat/types";

export const CHAT_CLIENT_CAP = 200;

export function maxPositiveId(ids: Iterable<number>): number {
  let max = 0;
  for (const id of ids) {
    if (Number.isFinite(id) && id > max) max = id;
  }
  return max;
}

export function capNewest<T extends { id: number }>(
  list: T[],
  cap = CHAT_CLIENT_CAP,
): T[] {
  if (list.length <= cap) return list;
  return list.slice(list.length - cap);
}

export function upsertById<T extends { id: number }>(
  list: T[],
  item: T,
  cap = CHAT_CLIENT_CAP,
): T[] {
  const idx = list.findIndex((row) => row.id === item.id);
  const next = idx === -1 ? [...list, item] : list.map((row, i) => (i === idx ? item : row));
  next.sort((a, b) => a.id - b.id);
  return capNewest(next, cap);
}

export function shouldKeepOnRollover(input: {
  reactionCount: number;
  pinned: boolean;
}): boolean {
  const count = Number.isFinite(input.reactionCount) ? input.reactionCount : 0;
  return input.pinned || count >= HALL_OF_FAME_MIN_REACTIONS;
}

export function pickQuoteOfWeek(
  candidates: { id: number; reactionCount: number; pinned: boolean }[],
): number | null {
  let quoteId: number | null = null;
  let quoteScore = -1;
  for (const row of candidates) {
    const count = Number.isFinite(row.reactionCount) ? row.reactionCount : 0;
    const score = count + (row.pinned ? 0.5 : 0);
    if (score > quoteScore) {
      quoteScore = score;
      quoteId = row.id;
    }
  }
  return quoteScore >= 1 ? quoteId : null;
}

export function isChatMessageShape(
  value: unknown,
): value is { id: number; managerId: number; body: string } {
  if (!value || typeof value !== "object") return false;
  const row = value as { id?: unknown; managerId?: unknown; body?: unknown };
  return (
    Number.isInteger(row.id) &&
    (row.id as number) > 0 &&
    Number.isInteger(row.managerId) &&
    typeof row.body === "string"
  );
}
