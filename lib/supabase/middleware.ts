import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

const PUBLIC_PREFIXES = ["/auth", "/guide"];
const AUTH_WAIT_MS = 4000;

async function getUserOrNull(
  supabase: ReturnType<typeof createServerClient>,
) {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("supabase auth timeout")),
          AUTH_WAIT_MS,
        );
      }),
    ]);
    return result.data.user ?? null;
  } catch (error) {
    console.error("[auth] middleware getUser failed", error);
    return null;
  }
}

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function unauthorized(request: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.searchParams.set(
    "next",
    `${pathname}${request.nextUrl.search || ""}`,
  );
  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  const { pathname } = request.nextUrl;
  const publicPath = isPublicPath(pathname);

  if (!url || !key) {
    // Fail closed in production so a misconfigured deploy cannot leak app routes.
    if (process.env.NODE_ENV === "production" && !publicPath) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Auth is not configured" },
          { status: 503 },
        );
      }
      return new NextResponse("Service unavailable — auth is not configured.", {
        status: 503,
      });
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const user = await getUserOrNull(supabase);

  if (user && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/league";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (!user && !publicPath) {
    return unauthorized(request, pathname);
  }

  // Only allowlisted admin emails can open /admin.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!user?.email || !isAdminEmail(user.email)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/league";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  // Expose pathname to server components (cinematic shell, etc.)
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  const withPath = NextResponse.next({
    request: { headers: requestHeaders },
  });
  for (const cookie of supabaseResponse.cookies.getAll()) {
    withPath.cookies.set(cookie.name, cookie.value);
  }
  return withPath;
}
