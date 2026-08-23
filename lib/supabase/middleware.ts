import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/auth/admin";
import { isPublicPath, loginPath, safeNextPath } from "@/lib/auth/paths";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/config";

function unauthorized(request: NextRequest, pathname: string) {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const redirectUrl = request.nextUrl.clone();
  const dest = loginPath(safeNextPath(`${pathname}${request.nextUrl.search || ""}`));
  const parsed = new URL(dest, request.nextUrl.origin);
  redirectUrl.pathname = parsed.pathname;
  redirectUrl.search = parsed.search;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && pathname === "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/continue";
    redirectUrl.search = "";
    const next = safeNextPath(request.nextUrl.searchParams.get("next"));
    if (next) redirectUrl.searchParams.set("next", next);
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

  // Expose pathname + auth flags so the root layout can draw chrome
  // without waiting on Postgres (Hobby functions time out at 10s).
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-signed-in", user ? "1" : "0");
  if (user?.email) {
    requestHeaders.set("x-user-email", encodeURIComponent(user.email));
    if (isAdminEmail(user.email)) {
      requestHeaders.set("x-is-admin", "1");
    }
  }
  const withPath = NextResponse.next({
    request: { headers: requestHeaders },
  });
  for (const cookie of supabaseResponse.cookies.getAll()) {
    withPath.cookies.set(cookie.name, cookie.value);
  }
  return withPath;
}
