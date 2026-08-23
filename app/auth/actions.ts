"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/admin/shared";
import { claimManagerForCurrentUser } from "@/lib/auth/claim";
import { continuePath, safeNextPath } from "@/lib/auth/paths";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isDatabaseConfigured } from "@/lib/db";

function revalidateAuthPaths() {
  revalidatePath("/");
  revalidatePath("/league");
  revalidatePath("/challenges");
  revalidatePath("/wall");
  revalidatePath("/auth/claim");
  revalidatePath("/auth/login");
  revalidatePath("/auth/register");
  revalidatePath("/auth/continue");
  revalidatePath("/onboarding/recap");
}

function recapRedirect(next: string | null, force = false) {
  const base = force ? "/onboarding/recap?force=1" : "/onboarding/recap";
  if (!next) return base;
  const join = base.includes("?") ? "&" : "?";
  return `${base}${join}next=${encodeURIComponent(next)}`;
}

function isNextRedirect(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT"),
  );
}

function mapAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  if (lower.includes("email not confirmed")) {
    return "Confirm your email first, then sign in.";
  }
  if (lower.includes("user already registered")) {
    return "That email already has an account. Sign in instead.";
  }
  return message;
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { email?: string }> {
  try {
    if (!isSupabaseConfigured()) {
      return {
        ok: false,
        message:
          "Auth isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and anon key.",
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
      return { ok: false, message: mapAuthError(error.message) };
    }

    // Email confirmation disabled in Supabase → session exists immediately.
    if (data.session) {
      revalidateAuthPaths();
      redirect(continuePath(next));
    }

    return {
      ok: true,
      email,
      message: "Check your email to confirm your account, then sign in.",
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't create an account. Try again.",
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
        message:
          "Auth isn't configured. Set NEXT_PUBLIC_SUPABASE_URL and anon key.",
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return { ok: false, message: mapAuthError(error.message) };
    }

    revalidateAuthPaths();
    // Commit cookies first. Verification lookup happens on /auth/continue.
    redirect(continuePath(next));
  } catch (error) {
    if (isNextRedirect(error)) throw error;
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
  try {
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
    redirect(recapRedirect(next, true));
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Couldn't verify that manager. Try again.",
    };
  }
}

export async function signOutAction(): Promise<void> {
  try {
    if (isSupabaseConfigured()) {
      const supabase = await createClient();
      await supabase.auth.signOut();
    }
  } catch (error) {
    console.error("[auth] signOut failed", error);
  }
  revalidateAuthPaths();
  redirect("/");
}
