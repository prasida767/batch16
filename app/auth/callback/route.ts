import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const intent = searchParams.get("intent");
  const nextRaw = searchParams.get("next") ?? "/auth/claim";
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/auth/claim";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Email confirmation from register → clear session, send to sign-in.
      if (intent === "register") {
        await supabase.auth.signOut();
        const dest = next.startsWith("/auth/login")
          ? next
          : "/auth/login?confirmed=1";
        return NextResponse.redirect(new URL(dest, origin));
      }

      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=confirm", origin));
}
