/**
 * Defense-in-depth for mutating Route Handlers.
 * Next.js server actions already enforce origin CSRF checks;
 * API routes do not — reject cross-origin POSTs in production when Site URL is set.
 */

function allowedOrigins(): string[] {
  const origins = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      origins.add(new URL(site).origin);
    } catch {
      /* ignore bad URL */
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    origins.add(
      vercel.startsWith("http") ? new URL(vercel).origin : `https://${vercel}`,
    );
  }
  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }
  return [...origins];
}

/** Returns a 403 Response when the request Origin is present and not allowlisted. */
export function rejectCrossOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  const allowed = allowedOrigins();
  if (allowed.length === 0) return null;
  if (allowed.includes(origin)) return null;

  return Response.json(
    { kind: "error", message: "Forbidden origin." },
    { status: 403 },
  );
}
