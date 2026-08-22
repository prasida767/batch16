/** Parse Baaji form fields without throwing. */

export function parseOpponentId(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function parseStakeNpr(raw: unknown):
  | { ok: true; value: number | null }
  | { ok: false; message: string } {
  const text = String(raw ?? "").trim();
  if (!text) return { ok: true, value: null };
  const n = Number(text);
  if (!Number.isFinite(n)) {
    return { ok: false, message: "Stake must be a number in NPR." };
  }
  if (n < 0) {
    return { ok: false, message: "Stake can't be negative." };
  }
  return { ok: true, value: Math.min(100_000, n) };
}

export function parseOptionalGameweek(raw: unknown): number | null {
  const text = String(raw ?? "").trim();
  if (!text) return null;
  const n = Number(text);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function parseChallengeId(raw: unknown): number | null {
  return parseOpponentId(raw);
}
