"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/admin/shared";
import { claimManagerForCurrentUser } from "@/lib/auth/claim";
import { getVerifiedManager } from "@/lib/auth/session";
import { getSeasonRecapPayload } from "@/lib/onboarding/recap";
import { hasSeenSeasonRecap } from "@/lib/onboarding/seen";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isDatabaseConfigured } from "@/lib/db";
import { isNextRedirect, logAppError } from "@/lib/errors/log";

function revalidateAuthPaths() {
  revalidatePath("/");
  revalidatePath("/league");
  revalidatePath("/challenges");
  revalidatePath("/wall");
  revalidatePath("/auth/claim");
  revalidatePath("/auth/login");
  revalidatePath("/auth/register");
  revalidatePath("/onboarding/recap");
}

function safeNextPath(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/auth") || value.startsWith("/onboarding")) return null;
  return value;
}

function recapRedirect(next: string | null, force = false) {
  const base = force ? "/onboarding/recap?force=1" : "/onboarding/recap";
  if (!next) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}next=${encodeURIComponent(next)}`;
}

async function maybeRecapPath(
  managerId: number,
  displayName: string,
  next: string | null,
): Promise<string> {
  if (!isDatabaseConfigured()) return next ?? "/league";
  try {
    const payload = await getSeasonRecapPayload({ managerId, displayName });
    if (!payload) return next ?? "/league";
    if (await hasSeenSeasonRecap(payload.seasonLabel, managerId)) {
      return next ?? "/league";
    }
    return recapRedirect(next);
  } catch {
    return next ?? "/league";
  }
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { email?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message: "Auth isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and anon key.",
      };
    }

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    const next = safeNextPath(formData.get("next"));

    if (!email || !email.includes("@")) {
      return { ok: false, message: "Enter a valid email address." };
    }
    if (password.length < 8) {
      return { ok: false, message: "Password must be at least 8 characters." };
    }
    if (password !== confirm) {
      return { ok: false, message: "Passwords don't match." };
    }

    const supabase = await createClient();
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
    const origin =
      siteUrl ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

    const claimNext = next
      ? `/auth/claim?next=${encodeURIComponent(next)}`
      : "/auth/claim";

    // After email confirm → land on sign-in (not auto-claimed session).
    const confirmNext = `/auth/login?confirmed=1${
      next ? `&next=${encodeURIComponent(next)}` : ""
    }`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: origin
        ? {
            emailRedirectTo: `${origin}/auth/callback?intent=register&next=${encodeURIComponent(confirmNext)}`,
          }
        : undefined,
    });

    if (error) {
      return { ok: false, message: error.message };
    }

    // Email confirmation disabled in Supabase → session exists immediately.
    if (data.session) {
      revalidateAuthPaths();
      redirect(claimNext);
    }

    return {
      ok: true,
      email,
      message:
        "Check your email to confirm your account, then sign in.",
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logAppError("auth", error, { action: "register" });
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't create that account. Try again.",
    };
  }
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message: "Auth isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and anon key.",
      };
    }

    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");
    const next = safeNextPath(formData.get("next"));

    if (!email || !password) {
      return { ok: false, message: "Email and password are required." };
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { ok: false, message: error.message };
    }

    revalidateAuthPaths();

    const verified = await getVerifiedManager();
    if (verified) {
      redirect(
        await maybeRecapPath(
          verified.managerId,
          verified.displayName,
          next,
        ),
      );
    }

    redirect(
      next
        ? `/auth/claim?next=${encodeURIComponent(next)}`
        : "/auth/claim",
    );
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logAppError("auth", error, { action: "login" });
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't sign in. Try again.",
    };
  }
}

export async function claimManagerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "Database isn't configured." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();
  const entryIdRaw = String(formData.get("entryId") ?? "").trim();
  const supportedTeamId = Number(formData.get("supportedTeamId"));
  const avatarVariant = Number(formData.get("avatarVariant"));
  const next = safeNextPath(formData.get("next"));

  const result = await claimManagerForCurrentUser({
    fullName,
    teamName,
    entryIdRaw,
    supportedTeamId,
    avatarVariant: Number.isInteger(avatarVariant) ? avatarVariant : undefined,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateAuthPaths();

  const verified = await getVerifiedManager();
  if (!verified) {
    return {
      ok: false,
      message:
        "We linked your FPL manager, but the session didn’t refresh as Verified. Sign out, sign back in, and open Link manager again.",
    };
  }

  redirect(recapRedirect(next, true));
}

export async function signOutAction(): Promise<void> {
  try {
    if (!isSupabaseConfigured()) {
      redirect("/");
    }
    const supabase = await createClient();
    await supabase.auth.signOut();
    revalidateAuthPaths();
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    logAppError("auth", error, { action: "signOut" });
  }
  redirect("/");
}
