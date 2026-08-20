import { redirect } from "next/navigation";
import { SeasonRecapExperience } from "@/components/onboarding/season-recap";
import { getVerifiedManager } from "@/lib/auth/session";
import { getSeasonRecapPayload } from "@/lib/onboarding/recap";
import { hasSeenSeasonRecap } from "@/lib/onboarding/seen";
import { isDatabaseConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

function safeNext(raw: string | undefined): string {
  if (!raw?.startsWith("/") || raw.startsWith("//")) return "/league";
  if (raw.startsWith("/auth") || raw.startsWith("/onboarding")) return "/league";
  return raw;
}

export default async function SeasonRecapPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; force?: string }>;
}) {
  const manager = await getVerifiedManager();
  const params = await searchParams;
  const nextPath = safeNext(params.next);
  const force = params.force === "1";

  if (!manager) {
    redirect(
      `/auth/login?next=${encodeURIComponent(`/onboarding/recap?next=${encodeURIComponent(nextPath)}`)}`,
    );
  }

  if (!isDatabaseConfigured()) {
    redirect(nextPath);
  }

  const payload = await getSeasonRecapPayload({
    managerId: manager.managerId,
    displayName: manager.displayName,
  });

  if (!payload) {
    redirect(nextPath);
  }

  if (!force && (await hasSeenSeasonRecap(payload.seasonLabel, manager.managerId))) {
    redirect(nextPath);
  }

  return <SeasonRecapExperience payload={payload} nextPath={nextPath} />;
}
