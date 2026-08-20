# Archived: Penalty Shootout

Removed from the live app (Aug 2026) because Realtime presence + frequent polling
stressed the Supabase free tier (memory / connection hangs that froze other pages).

## Restore later (paid plan)

1. Move these folders back:

| Archive path | Live path |
|--------------|-----------|
| `archive/penalties/lib/*` | `lib/penalties/` |
| `archive/penalties/components/*` | `components/penalties/` |
| `archive/penalties/app/actions.ts` | `app/penalties/actions.ts` |
| `archive/penalties/app/page.archived.tsx` | `app/penalties/page.tsx` (replace the stub) |
| `archive/penalties/app/loading.tsx` | `app/penalties/loading.tsx` |

2. Re-add `{ href: "/penalties", label: "Penalties" }` in `components/layout/navbar.tsx`.

3. Re-enable the Guide section copy if desired.

4. DB table `penalty_matches` and migration `drizzle/0009_penalty_shootout.sql` were **left in place** — no schema restore needed.

## Notes

- Imports still use `@/lib/penalties` and `@/components/penalties` — they work again once files are moved back.
- Prefer keeping Realtime presence **opt-in** and light inbox polling when restoring on free/cheap tiers.
