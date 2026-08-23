/** Routes that do not require a signed-in session. */
const PUBLIC_PREFIXES = ["/auth", "/guide"];

export function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Safe in-app return path after login / claim. */
export function safeNextPath(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.startsWith("/auth") || value.startsWith("/onboarding")) return null;
  return value;
}

export type ClaimState = "linked" | "unlinked" | "unknown";

/**
 * Where to send a signed-in user after login (or /auth/continue).
 * Unknown claim state (DB down) goes to the app, not the claim trap.
 */
export function afterAuthPath(args: {
  verified: boolean;
  claimState: ClaimState;
  next: string | null;
}): string {
  if (args.verified || args.claimState === "unknown") {
    return args.next ?? "/league";
  }
  return args.next
    ? `/auth/claim?next=${encodeURIComponent(args.next)}`
    : "/auth/claim";
}

export function continuePath(next: string | null): string {
  return next
    ? `/auth/continue?next=${encodeURIComponent(next)}`
    : "/auth/continue";
}

export function loginPath(next: string | null): string {
  return next ? `/auth/login?next=${encodeURIComponent(next)}` : "/auth/login";
}

export function claimPath(next: string | null): string {
  return next ? `/auth/claim?next=${encodeURIComponent(next)}` : "/auth/claim";
}
