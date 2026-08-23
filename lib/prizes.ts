export const DEFAULT_CURRENCY = "NPR";
export const DEFAULT_PLANNED_GAMEWEEKS = 38;

export type CustomPrize = {
  id: string;
  label: string;
  amount: string;
};

export const EMPTY_PRIZE_CONFIG = {
  entryFee: "0.00",
  weeklyWinner: "0.00",
  overall1st: "0.00",
  overall2nd: "0.00",
  lastPlace: "0.00",
  customPrizes: [] as CustomPrize[],
  currency: DEFAULT_CURRENCY,
};

export type PrizeConfigFormValues = typeof EMPTY_PRIZE_CONFIG;

export const CURRENCIES = [
  { code: "NPR", label: "NPR — Nepalese Rupee" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "INR", label: "INR — Indian Rupee" },
] as const;

export function parseMoney(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function moneyToDb(value: unknown): string {
  const n = parseMoney(value);
  if (n < 0) {
    throw new Error("Amounts must be zero or greater.");
  }
  return n.toFixed(2);
}

export function formatMoney(amount: number, currency = DEFAULT_CURRENCY): string {
  try {
    return new Intl.NumberFormat("en-NP", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function totalPot(entryFee: number, managerCount: number): number {
  return parseMoney(entryFee) * Math.max(0, managerCount);
}

/** Only claimed (verified) FPL managers fund the prize pot. */
export function managersInPot(
  managers: Array<{ fplEntryId: number | null; verified: boolean }>,
): number {
  return managers.filter(
    (manager) => manager.fplEntryId != null && manager.verified,
  ).length;
}

export function customPrizesTotal(prizes: CustomPrize[]): number {
  return prizes.reduce((sum, prize) => sum + parseMoney(prize.amount), 0);
}

/** Built-in season places + custom named prizes. */
export function seasonPrizesTotal(values: {
  overall1st: string | number;
  overall2nd: string | number;
  lastPlace: string | number;
  customPrizes: CustomPrize[];
}): number {
  return (
    parseMoney(values.overall1st) +
    parseMoney(values.overall2nd) +
    parseMoney(values.lastPlace) +
    customPrizesTotal(values.customPrizes)
  );
}

export function weeklyBudget(
  weeklyWinner: number,
  gameweeks: number,
): number {
  return parseMoney(weeklyWinner) * Math.max(0, Math.floor(gameweeks));
}

/** Pot left after weekly budget + all season/custom prizes. */
export function remainingPot(args: {
  pot: number;
  weeklyWinner: number;
  gameweeks: number;
  overall1st: string | number;
  overall2nd: string | number;
  lastPlace: string | number;
  customPrizes: CustomPrize[];
}): number {
  const allocated =
    weeklyBudget(args.weeklyWinner, args.gameweeks) +
    seasonPrizesTotal(args);
  return Math.round((args.pot - allocated) * 100) / 100;
}

export function createCustomPrizeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `prize_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function parseCustomPrizes(raw: unknown): CustomPrize[] {
  if (typeof raw === "string") {
    try {
      return parseCustomPrizes(JSON.parse(raw));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(raw)) return [];

  const out: CustomPrize[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const label = String(row.label ?? "").trim();
    if (!label) continue;
    out.push({
      id: String(row.id ?? createCustomPrizeId()),
      label: label.slice(0, 80),
      amount: moneyToDb(row.amount ?? 0),
    });
  }
  return out;
}
