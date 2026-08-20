import "server-only";

import { cookies } from "next/headers";
import { recapCookieName } from "@/lib/onboarding/recap-keys";

export { recapCookieName, recapLocalStorageKey, RECAP_COOKIE_PREFIX } from "@/lib/onboarding/recap-keys";

export async function hasSeenSeasonRecap(
  seasonLabel: string,
  managerId: number,
): Promise<boolean> {
  const jar = await cookies();
  const raw = jar.get(recapCookieName(seasonLabel))?.value;
  if (!raw) return false;
  return raw === String(managerId) || raw === "1";
}
