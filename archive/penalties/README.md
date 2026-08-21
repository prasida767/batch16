# Archived: Penalty Shootout

Removed from the live app because the page hung (heavy DB + Realtime) and froze
other tabs. Code is kept here so we can restore it later. It is **not compiled**
and **not reachable** (no `/penalties` route, no server actions, middleware 404s
the path).

## Restore

1. Move files back:

| Here | Live path |
|------|-----------|
| `archive/penalties/lib/*` | `lib/penalties/` |
| `archive/penalties/components/*` | `components/penalties/` |
| `archive/penalties/app/actions.ts` | `app/penalties/actions.ts` (put `"use server"` back at the top) |
| `archive/penalties/app/page.tsx` | `app/penalties/page.tsx` |
| `archive/penalties/app/loading.tsx` | `app/penalties/loading.tsx` |

2. Re-add `{ href: "/penalties", label: "Penalties" }` in `components/layout/navbar.tsx`.
3. Remove the `/penalties` 404 in `middleware.ts`.
4. Re-add `penaltyAction: { limit: 40, windowMs: 60_000 }` to `RATE_LIMITS` in `lib/security/rate-limit.ts`.

DB table `penalty_matches` and migration `drizzle/0009_penalty_shootout.sql` were
left in place — no schema restore needed.

Imports still use `@/lib/penalties` and `@/components/penalties` — they work
again once files are moved back.
