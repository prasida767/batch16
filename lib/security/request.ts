/**
 * Defense-in-depth for mutating Route Handlers.
 * Next.js server actions already enforce origin CSRF checks;
 * API routes do not — reject clearly cross-site POSTs.
 *
 * Same-origin requests (browser Origin matches this deployment's URL)
 * are always allowed. That covers custom domains and *.vercel.app
 * without requiring NEXT_PUBLIC_SITE_URL to be perfect.
 */

function normalizeOrigin(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
    return new URL(withProtocol).origin;
  } catch {
    return null;
  }
}

function allowedOrigins(request: Request): string[] {
  const origins = new Set<string>();

  // Always trust this deployment's own origin (custom domain or vercel.app).
  try {
    origins.add(new URL(request.url).origin);
  } catch {
    /* ignore */
  }

  for (const value of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL,
  ]) {
    const origin = value ? normalizeOrigin(value) : null;
    if (origin) origins.add(origin);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return [...origins];
}

/** Returns a 403 Response when the request Origin is present and not allowlisted. */
export function rejectCrossOrigin(request: Request): Response | null {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return null;

  const origin = normalizeOrigin(originHeader);
  if (!origin) return null;

  const allowed = allowedOrigins(request);
  if (allowed.includes(origin)) return null;

  return Response.json(
    { kind: "error", message: "Forbidden origin." },
    { status: 403 },
  );
}
