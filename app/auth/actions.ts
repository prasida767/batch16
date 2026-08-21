"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/admin/shared";
import { withTimeout } from "@/lib/async/timeout";
import { claimManagerForCurrentUser } from "@/lib/auth/claim";
import {
  getVerifiedManager,
  lookupVerifiedManagerForUser,
} from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isDatabaseConfigured, resetDbClient } from "@/lib/db";

const AUTH_TIMEOUT_MS = 12_000;
const VERIFY_TIMEOUT_MS = 4_000;

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

/**
 * After password auth: decide claim vs league without blocking forever on Postgres.
 * Skips the heavy season-recap fetch on the critical path (recap is available from claim).
 */
async function resolvePostLoginPath(
  userId: string,
  next: string | null,
): Promise<string> {
  const league = next ?? "/league";
  const claim = next
    ? `/auth/claim?next=${encodeURIComponent(next)}`
    : "/auth/claim";

  if (!isDatabaseConfigured()) return claim;

  try {
    const verified = await withTimeout(
      lookupVerifiedManagerForUser(userId),
      VERIFY_TIMEOUT_MS,
      "verify-manager",
    );
    return verified ? league : claim;
  } catch {
    await resetDbClient().catch(() => undefined);
    // Auth already succeeded — never trap the user on the login button.
    return league;
  }
}

export async function registerAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult & { email?: string }> {
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
}

export async function loginAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
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

  let authError: { message: string } | null = null;
  let userId: string | null = null;
  try {
    const result = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
      "sign-in",
    );
    authError = result.error;
    userId = result.data.user?.id ?? null;
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Sign-in timed out. Try again in a moment.",
    };
  }

  if (authError) {
    return { ok: false, message: authError.message };
  }

  revalidateAuthPaths();

  // Prefer user id from sign-in; fall back to getUser if needed.
  if (!userId) {
    const { data } = await supabase.auth.getUser();
    userId = data.user?.id ?? null;
  }

  const dest = userId
    ? await resolvePostLoginPath(userId, next)
    : next
      ? `/auth/claim?next=${encodeURIComponent(next)}`
      : "/auth/claim";

  redirect(dest);
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
  const supportedTeamId = Number(formData.get("supportedTeamId"));
  const avatarVariant = Number(formData.get("avatarVariant"));
  const next = safeNextPath(formData.get("next"));

  const result = await claimManagerForCurrentUser({
    fullName,
    teamName,
    supportedTeamId,
    avatarVariant: Number.isInteger(avatarVariant) ? avatarVariant : undefined,
  });
  if (!result.ok) {
    return { ok: false, message: result.message };
  }

  revalidateAuthPaths();

  const verified = await getVerifiedManager();
  if (verified) {
    // Always show recap after a fresh claim (first-time link).
    redirect(recapRedirect(next, true));
  }

  redirect(next ?? "/league");
}

export async function signOutAction(): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidateAuthPaths();
  redirect("/");
}
