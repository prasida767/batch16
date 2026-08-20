import ExcelJS from "exceljs";
import {
  canonicalKeyFromName,
  looksLikePersonName,
  preferredDisplayName,
} from "@/lib/history/names";

export type ParsedWeeklyWinner = {
  gameweek: number;
  winnerRaw: string;
  canonicalKey: string;
  displayName: string;
  points: number | null;
};

export type ParsedSeasonPrize = {
  prizeType: string;
  winnerRaw: string;
  canonicalKey: string;
  displayName: string;
  amount: number | null;
};

export type ParsedSeason = {
  sheetName: string;
  label: string;
  startYear: number;
  weeklyWinners: ParsedWeeklyWinner[];
  seasonPrizes: ParsedSeasonPrize[];
};

export type ParseExcelResult = {
  seasons: ParsedSeason[];
  warnings: string[];
};

const SEASON_SHEET_RE = /^FPL\s+(\d{4})-(\d{2})$/i;

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim();
  }
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    if (Array.isArray(obj.richText)) {
      return obj.richText
        .map((part) =>
          typeof part === "object" && part && "text" in part
            ? String((part as { text: unknown }).text ?? "")
            : "",
        )
        .join("")
        .trim();
    }
    if ("text" in obj) {
      return String(obj.text ?? "").trim();
    }
    if ("result" in obj) {
      return String(obj.result ?? "").trim();
    }
    if ("hyperlink" in obj && "text" in obj) {
      return String(obj.text ?? "").trim();
    }
  }
  return String(value).trim();
}

function cellNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const t = cellText(value).replace(/,/g, "");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseGameweekLabel(raw: string): number | null {
  const m = raw.match(/GW[-\s]?(\d{1,2})/i);
  if (!m) return null;
  const gw = Number(m[1]);
  return gw >= 1 && gw <= 38 ? gw : null;
}

type HeaderCols = {
  headerRow: number;
  gwCol: number;
  pointsCol: number;
  winnerCol: number;
};

function findGwHeader(sheet: ExcelJS.Worksheet): HeaderCols | null {
  for (let r = 1; r <= 12; r++) {
    const row = sheet.getRow(r);
    const texts: Array<{ col: number; text: string }> = [];
    row.eachCell({ includeEmpty: false }, (cell, col) => {
      texts.push({ col, text: cellText(cell.value).toLowerCase() });
    });
    const gw = texts.find((t) => /gameweek|gw\s*#|gw\b/.test(t.text) && !/winner/.test(t.text));
    const winner = texts.find((t) => /winner/.test(t.text));
    const points = texts.find(
      (t) =>
        /points|pts|score/.test(t.text) &&
        t.col !== gw?.col &&
        t.col !== winner?.col,
    );
    if (gw && winner) {
      return {
        headerRow: r,
        gwCol: gw.col,
        pointsCol: points?.col ?? gw.col + 1,
        winnerCol: winner.col,
      };
    }
  }
  return null;
}

function parseWeeklyWinners(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
  sheetName: string,
): ParsedWeeklyWinner[] {
  const header = findGwHeader(sheet);
  if (!header) {
    warnings.push(`${sheetName}: no Gameweek/Winner header found`);
    return [];
  }

  const byGw = new Map<number, ParsedWeeklyWinner>();

  for (let r = header.headerRow + 1; r <= Math.min(sheet.rowCount, 80); r++) {
    const row = sheet.getRow(r);
    const gwRaw = cellText(row.getCell(header.gwCol).value);
    const gw = parseGameweekLabel(gwRaw) ?? cellNumber(row.getCell(header.gwCol).value);
    if (gw == null || gw < 1 || gw > 38) continue;

    const winnerRaw = cellText(row.getCell(header.winnerCol).value);
    if (!looksLikePersonName(winnerRaw)) continue;

    const key = canonicalKeyFromName(winnerRaw);
    if (!key) continue;

    const points = cellNumber(row.getCell(header.pointsCol).value);
    byGw.set(gw, {
      gameweek: gw,
      winnerRaw,
      canonicalKey: key,
      displayName: preferredDisplayName(winnerRaw, key),
      points,
    });
  }

  return [...byGw.values()].sort((a, b) => a.gameweek - b.gameweek);
}

const PRIZE_LABEL_MAP: Array<{ pattern: RegExp; type: string }> = [
  { pattern: /^(winner|champions?|1st|first|overall\s*1st|overall\s*winner)$/i, type: "overall_1st" },
  { pattern: /^(runner[\s-]?ups?|2nd|second|overall\s*2nd)$/i, type: "overall_2nd" },
  { pattern: /^(unlucky|consolation|last|wooden)$/i, type: "consolation" },
  { pattern: /^(highest|highest\s*point|highest\s*gw|highest\s*single)/i, type: "highest_gw" },
  { pattern: /^6th$/i, type: "lucky_6th" },
  { pattern: /^7th$/i, type: "lucky_7th" },
  { pattern: /^13th$/i, type: "lucky_13th" },
  { pattern: /^14th$/i, type: "lucky_14th" },
  { pattern: /^15th|relegation/i, type: "lucky_15th" },
];

function mapPrizeLabel(label: string): string | null {
  const t = label.trim();
  for (const { pattern, type } of PRIZE_LABEL_MAP) {
    if (pattern.test(t)) return type;
  }
  if (/winner of|overall\s*winner|^winner\b/i.test(t) && !/unlucky/i.test(t)) {
    return "overall_1st";
  }
  if (/second|runner/i.test(t)) return "overall_2nd";
  if (/unlucky|consolation/i.test(t)) return "consolation";
  if (/highest/i.test(t)) return "highest_gw";
  if (/\b6th\b|6\s*position/i.test(t)) return "lucky_6th";
  if (/\b7th\b|7\s*position/i.test(t)) return "lucky_7th";
  if (/\b13th\b|13\s*position/i.test(t)) return "lucky_13th";
  if (/\b14th\b|14\s*position/i.test(t)) return "lucky_14th";
  if (/\b15th\b|15\s*position|relegation/i.test(t)) return "lucky_15th";
  return null;
}

function pushPrize(
  list: ParsedSeasonPrize[],
  prizeType: string,
  winnerRaw: string,
  amount: number | null,
) {
  if (!looksLikePersonName(winnerRaw)) return;
  const key = canonicalKeyFromName(winnerRaw);
  if (!key) return;
  // Dedupe by type+key
  if (list.some((p) => p.prizeType === prizeType && p.canonicalKey === key)) return;
  list.push({
    prizeType,
    winnerRaw,
    canonicalKey: key,
    displayName: preferredDisplayName(winnerRaw, key),
    amount,
  });
}

/** 2024-25 style: A=label, B=name, C=amount */
function parsePrizeBlockAbc(
  sheet: ExcelJS.Worksheet,
  prizes: ParsedSeasonPrize[],
) {
  for (let r = 1; r <= Math.min(sheet.rowCount, 80); r++) {
    const row = sheet.getRow(r);
    const a = cellText(row.getCell(1).value);
    const b = cellText(row.getCell(2).value);
    const c = cellText(row.getCell(3).value);

    // Label in A, name in B
    const typeFromA = mapPrizeLabel(a);
    if (typeFromA && looksLikePersonName(b)) {
      pushPrize(prizes, typeFromA, b, cellNumber(row.getCell(3).value));
      continue;
    }

    // Name in A, amount in B, label in C (2025-26)
    const typeFromC = mapPrizeLabel(c);
    if (typeFromC && looksLikePersonName(a)) {
      pushPrize(prizes, typeFromC, a, cellNumber(row.getCell(2).value));
    }
  }
}

/** Prefer a trailing "First Last" (or known single name) on a reward line. */
function trailingPersonName(line: string): string | null {
  const two = line.match(
    /\b([A-Z][a-zA-Z'-]+(?:\s+[A-Z][a-zA-Z'-]+)+)\s*[.]?\s*$/,
  );
  if (two?.[1] && looksLikePersonName(two[1])) return two[1].trim();

  const one = line.match(/\b([A-Z][a-zA-Z'-]{2,})\s*[.]?\s*$/);
  if (
    one?.[1] &&
    looksLikePersonName(one[1]) &&
    !/^(Manager|Position|Otherwise|Rewards|Gameweek|Overall|Runner|Winner|Rs)$/i.test(
      one[1],
    )
  ) {
    return one[1].trim();
  }
  return null;
}

/** Extract named prizes from free-text rules (2023-24). */
function parsePrizesFromRulesText(
  sheet: ExcelJS.Worksheet,
  prizes: ParsedSeasonPrize[],
) {
  const blob = cellText(sheet.getRow(1).getCell(1).value);
  if (!blob || blob.length < 40) return;

  const lineMatchers: Array<{ startsWith: RegExp; type: string }> = [
    { startsWith: /^Overall Winner:/i, type: "overall_1st" },
    { startsWith: /^1st Runner up:/i, type: "overall_2nd" },
    { startsWith: /^(?:Gameweek Consolation|Consolation):/i, type: "consolation" },
    {
      startsWith: /^Highest point in single gameweek:/i,
      type: "highest_gw",
    },
    { startsWith: /^Overall 7th Position:/i, type: "lucky_7th" },
    { startsWith: /^Overall 14th Position:/i, type: "lucky_14th" },
    { startsWith: /^Overall 6th Position:/i, type: "lucky_6th" },
    { startsWith: /^Overall 13th Position:/i, type: "lucky_13th" },
  ];

  for (const line of blob.split(/\n+/)) {
    const trimmed = line.trim();
    for (const { startsWith, type } of lineMatchers) {
      if (!startsWith.test(trimmed)) continue;
      const name = trailingPersonName(trimmed);
      if (name) pushPrize(prizes, type, name, null);
    }
  }
}

function parseSeasonSheet(
  sheet: ExcelJS.Worksheet,
  warnings: string[],
): ParsedSeason | null {
  const match = sheet.name.match(SEASON_SHEET_RE);
  if (!match) return null;

  const startYear = Number(match[1]);
  const endYY = match[2];
  const label = `${startYear}-${endYY}`;

  const weeklyWinners = parseWeeklyWinners(sheet, warnings, sheet.name);
  const seasonPrizes: ParsedSeasonPrize[] = [];
  parsePrizeBlockAbc(sheet, seasonPrizes);
  if (seasonPrizes.length === 0) {
    parsePrizesFromRulesText(sheet, seasonPrizes);
  }

  return {
    sheetName: sheet.name,
    label,
    startYear,
    weeklyWinners,
    seasonPrizes,
  };
}

export async function parseHistoricalWorkbook(
  filePath: string,
): Promise<ParseExcelResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const warnings: string[] = [];
  const seasons: ParsedSeason[] = [];

  for (const sheet of workbook.worksheets) {
    const parsed = parseSeasonSheet(sheet, warnings);
    if (!parsed) continue;
    seasons.push(parsed);
    if (parsed.weeklyWinners.length === 0) {
      warnings.push(`${parsed.sheetName}: no weekly winners extracted`);
    }
  }

  seasons.sort((a, b) => a.startYear - b.startYear);
  return { seasons, warnings };
}
