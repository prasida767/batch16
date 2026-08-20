import type { ChatRosterSeat } from "@/lib/chat/types";

export type SeatLayout = {
  top: ChatRosterSeat[];
  right: ChatRosterSeat[];
  bottom: ChatRosterSeat[];
  left: ChatRosterSeat[];
};

/** Even rectangular seating — never places anyone in the centre. */
export function distributeSeats(roster: ChatRosterSeat[]): SeatLayout {
  const n = roster.length;
  if (n === 0) {
    return { top: [], right: [], bottom: [], left: [] };
  }

  const topCount = Math.ceil(n / 4);
  const remaining = n - topCount;
  const bottomCount = Math.ceil(remaining / 3);
  const rem2 = remaining - bottomCount;
  const leftCount = Math.ceil(rem2 / 2);
  const rightCount = rem2 - leftCount;

  let i = 0;
  const top = roster.slice(i, (i += topCount));
  const right = roster.slice(i, (i += rightCount));
  const bottom = roster.slice(i, (i += bottomCount));
  const left = roster.slice(i, i + leftCount);

  return { top, right, bottom, left };
}
