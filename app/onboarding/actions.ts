"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getVerifiedManager } from "@/lib/auth/session";
import { recapCookieName } from "@/lib/onboarding/seen";

function safeNextPath(raw: unknown): string {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return "/league";
  if (value.startsWith("/auth") || value.startsWith("/onboarding")) {
    return "/league";
  }
  return value;
}

export async function completeSeasonRecapAction(formData: FormData) {
  const manager = await getVerifiedManager();
  const seasonLabel = String(formData.get("seasonLabel") ?? "").trim();
  const next = safeNextPath(formData.get("next"));

  if (manager && seasonLabel) {
    const jar = await cookies();
    jar.set(recapCookieName(seasonLabel), String(manager.managerId), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 400,
    });
  }

  redirect(next);
}
