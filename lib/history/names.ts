/**
 * Normalize FPL manager names from historical Excel sheets.
 * Maps known spelling variants onto a single canonical_key.
 */

const ALIASES: Record<string, string> = {
  // Prajwal
  prajwal_sthapit: "prajwal_sthapit",
  prajjwal_sthapit: "prajwal_sthapit",
  prajwol_sthapit: "prajwal_sthapit",
  // Sujan
  sujan_chauhan: "sujan_chauhan",
  suzan_chauhan: "sujan_chauhan",
  // Sanjeev Budha
  sanjeev_budha: "sanjeev_budha",
  sanjeev_buda: "sanjeev_budha",
  // Ashim
  ashim_regmi: "ashim_regmi",
  asim_regmi: "ashim_regmi",
  // Prasiddha
  prasiddha_khadka: "prasiddha_khadka",
  prasidha_khadka: "prasiddha_khadka",
  prasiddha: "prasiddha_khadka",
  prasidha: "prasiddha_khadka",
  // Pratik
  pratik_budhathoki: "pratik_budhathoki",
  pratik_budathoki: "pratik_budhathoki",
  // Sunil
  sunil_lamsal: "sunil_lamsal",
  shunil_lamsal: "sunil_lamsal",
  // Utsuk
  utsuk_nirula: "utsuk_nirula",
  utsuk_niraula: "utsuk_nirula",
  utsuk: "utsuk_nirula",
  // Bidish
  bidish: "bidish_acharya",
  bidish_acharya: "bidish_acharya",
  bidish_karki: "bidish_acharya",
  // Anil
  anil_lama: "anil_lama",
  // Sarthak / Shankar
  sarthak: "sarthak_khanal",
  sarthak_khanal: "sarthak_khanal",
  sarthak_adhikari: "sarthak_adhikari",
  shankar: "shankar_koirala",
  shankar_koirala: "shankar_koirala",
  shankar_adhikari: "shankar_adhikari",
};

/** Preferred display names for known canonical keys. */
const DISPLAY_NAMES: Record<string, string> = {
  prajwal_sthapit: "Prajwal Sthapit",
  sujan_chauhan: "Sujan Chauhan",
  sanjeev_budha: "Sanjeev Budha",
  ashim_regmi: "Ashim Regmi",
  prasiddha_khadka: "Prasiddha Khadka",
  pratik_budhathoki: "Pratik Budhathoki",
  sunil_lamsal: "Sunil Lamsal",
  utsuk_nirula: "Utsuk Nirula",
};

export function slugifyName(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function canonicalKeyFromName(raw: string): string {
  const slug = slugifyName(raw.trim());
  if (!slug) return "";
  return ALIASES[slug] ?? slug;
}

export function preferredDisplayName(raw: string, key: string): string {
  if (DISPLAY_NAMES[key]) return DISPLAY_NAMES[key];
  return raw.trim().replace(/\s+/g, " ");
}

/** True if the cell looks like a real person name, not a label or amount. */
export function looksLikePersonName(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (t.length < 2 || t.length > 60) return false;
  if (/^\d+(\.\d+)?$/.test(t)) return false;
  if (/^(winner|runner|unlucky|highest|lucky|consolation|champions?|relegation|gw[-\s]?\d+)/i.test(t)) {
    return false;
  }
  // Must contain at least one letter
  return /[a-zA-Z]/.test(t);
}
