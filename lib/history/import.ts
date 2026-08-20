import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  managers,
  seasonPrizes,
  seasons,
  weeklyWinners,
} from "@/lib/db/schema";
import {
  parseHistoricalWorkbook,
  type ParsedSeason,
} from "@/lib/history/parse-excel";

export type SeasonImportSummary = {
  label: string;
  weeklyWinners: number;
  seasonPrizes: number;
  managersCreated: number;
};

export type ImportHistoricalResult = {
  ok: boolean;
  message: string;
  seasons: SeasonImportSummary[];
  warnings: string[];
};

async function upsertManagerByCanonicalKey(args: {
  canonicalKey: string;
  displayName: string;
}): Promise<{ id: number; created: boolean }> {
  const db = getDb();
  const existing = await db
    .select({ id: managers.id, displayName: managers.displayName })
    .from(managers)
    .where(eq(managers.canonicalKey, args.canonicalKey))
    .limit(1);

  if (existing[0]) {
    return { id: existing[0].id, created: false };
  }

  const inserted = await db
    .insert(managers)
    .values({
      fplEntryId: null,
      canonicalKey: args.canonicalKey,
      name: args.displayName,
      displayName: args.displayName,
    })
    .returning({ id: managers.id });

  return { id: inserted[0]!.id, created: true };
}

async function upsertSeason(parsed: ParsedSeason): Promise<number> {
  const db = getDb();
  const existing = await db
    .select({ id: seasons.id })
    .from(seasons)
    .where(eq(seasons.label, parsed.label))
    .limit(1);

  if (existing[0]) {
    await db
      .update(seasons)
      .set({ name: parsed.sheetName, startYear: parsed.startYear })
      .where(eq(seasons.id, existing[0].id));
    return existing[0].id;
  }

  const inserted = await db
    .insert(seasons)
    .values({
      label: parsed.label,
      name: parsed.sheetName,
      startYear: parsed.startYear,
    })
    .returning({ id: seasons.id });

  return inserted[0]!.id;
}

async function importSeason(parsed: ParsedSeason): Promise<SeasonImportSummary> {
  const db = getDb();
  const seasonId = await upsertSeason(parsed);
  let managersCreated = 0;

  const managerIds = new Map<string, number>();

  async function resolveManager(canonicalKey: string, displayName: string) {
    const cached = managerIds.get(canonicalKey);
    if (cached != null) return cached;
    const result = await upsertManagerByCanonicalKey({
      canonicalKey,
      displayName,
    });
    if (result.created) managersCreated += 1;
    managerIds.set(canonicalKey, result.id);
    return result.id;
  }

  // Replace season rows so re-import is idempotent even if winners change.
  await db.delete(weeklyWinners).where(eq(weeklyWinners.seasonId, seasonId));
  await db.delete(seasonPrizes).where(eq(seasonPrizes.seasonId, seasonId));

  for (const w of parsed.weeklyWinners) {
    const managerId = await resolveManager(w.canonicalKey, w.displayName);
    await db.insert(weeklyWinners).values({
      seasonId,
      gameweek: w.gameweek,
      managerId,
      points: w.points,
    });
  }

  for (const p of parsed.seasonPrizes) {
    const managerId = await resolveManager(p.canonicalKey, p.displayName);
    await db.insert(seasonPrizes).values({
      seasonId,
      prizeType: p.prizeType,
      managerId,
      amount: p.amount != null ? p.amount.toFixed(2) : null,
    });
  }

  return {
    label: parsed.label,
    weeklyWinners: parsed.weeklyWinners.length,
    seasonPrizes: parsed.seasonPrizes.length,
    managersCreated,
  };
}

export async function importHistoricalFromPath(
  filePath: string,
): Promise<ImportHistoricalResult> {
  const raw = filePath.trim();
  if (!raw) {
    return {
      ok: false,
      message: "Provide a path to an Excel file under data/imports/.",
      seasons: [],
      warnings: [],
    };
  }
  if (!raw.toLowerCase().endsWith(".xlsx")) {
    return {
      ok: false,
      message: "File must be a .xlsx workbook.",
      seasons: [],
      warnings: [],
    };
  }

  // Only allow files inside <cwd>/data/imports (blocks absolute path traversal).
  const path = await import("node:path");
  if (raw.includes("..") || raw.includes("\0")) {
    return {
      ok: false,
      message: "Invalid import path.",
      seasons: [],
      warnings: [],
    };
  }
  const importsRoot = path.resolve(process.cwd(), "data", "imports");
  const resolved = path.resolve(
    importsRoot,
    path.isAbsolute(raw) ? path.basename(raw) : raw,
  );
  if (
    resolved !== importsRoot &&
    !resolved.startsWith(importsRoot + path.sep)
  ) {
    return {
      ok: false,
      message:
        "Import path must stay under data/imports/ (place the .xlsx there).",
      seasons: [],
      warnings: [],
    };
  }

  const { seasons: parsedSeasons, warnings } =
    await parseHistoricalWorkbook(resolved);

  if (parsedSeasons.length === 0) {
    return {
      ok: false,
      message: "No FPL season sheets found (expected names like FPL 2024-25).",
      seasons: [],
      warnings,
    };
  }

  const summaries: SeasonImportSummary[] = [];
  for (const season of parsedSeasons) {
    summaries.push(await importSeason(season));
  }

  const totalGw = summaries.reduce((s, x) => s + x.weeklyWinners, 0);
  const totalPrizes = summaries.reduce((s, x) => s + x.seasonPrizes, 0);

  return {
    ok: true,
    message: `Imported ${parsedSeasons.length} seasons · ${totalGw} weekly winners · ${totalPrizes} season prizes.`,
    seasons: summaries,
    warnings,
  };
}
