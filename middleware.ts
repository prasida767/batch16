import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname === "/penalties" ||
    pathname.startsWith("/penalties/") ||
    pathname === "/api/penalties" ||
    pathname.startsWith("/api/penalties/")
  ) {
    return new NextResponse(null, { status: 404 });
  }
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets and images; refresh auth on app routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
