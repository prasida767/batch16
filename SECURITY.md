# Security

Batch 16 is a private league app. This document covers secret handling and
production hardening. Apply the checklist before pushing to GitHub or deploying.

## Secrets — safe for GitHub?

| Item | Status |
|------|--------|
| `.env.local` / real env files | Ignored via `.gitignore` (`.env*`, keep `.env.example`) |
| `.env.example` | Dummy placeholders only — safe to commit |
| Hardcoded API keys / DB passwords | None found in app source |
| Supabase `service_role` key | **Do not add** — app uses `DATABASE_URL` + anon key |

Before every push:

```bash
git status   # confirm .env.local is not listed
npm run security:check
```

## Auth model

- **Signed in** → Supabase session (middleware)
- **Verified** → `manager_accounts` link after claim — required for chat, Baaji, wall writes, penalties play, taunts, notifications
- **Admin** → email in `ADMIN_EMAILS` — required for `/admin` and all mutating award/admin actions

Unverified users can browse league data but cannot perform privileged writes.

## What we hardened

- Admin gates on awards / wall admin / documentary ensure / challenge admin data
- Wall delete: author or admin only
- Penalty match polling: participants only; choices redacted while choosing
- Input caps + sanitisation (chat, wall, baaji)
- Rate limits on chat, reactions, taunts, baaji create, wall posts
- API mutating routes: same-origin check when `NEXT_PUBLIC_SITE_URL` is set
- Historical Excel import restricted to `data/imports/`
- RLS policies in `drizzle/0014_rls_policies.sql` for anon/authenticated PostgREST

## Apply RLS

```bash
# After reviewing the SQL:
psql "$DATABASE_URL" -f drizzle/0014_rls_policies.sql
# or fold into your migration runner
```

Note: the server `DATABASE_URL` role typically bypasses RLS. RLS protects
direct Supabase client / Realtime access.

## Remaining recommendations

1. **Set `NEXT_PUBLIC_SITE_URL` in production** so origin checks and auth redirects work.
2. **Never commit** Supabase service role keys or production `DATABASE_URL`.
3. **Enable leaked password protection** in Supabase Auth if available on your plan.
4. **Rotate** DB password / anon key if they were ever pasted into chat or screenshots.
5. For multi-instance hosting, replace in-memory rate limits with Redis / Upstash.
6. Prefer uploading Excel via FormData instead of server filesystem paths long-term.
7. Add CSP headers gradually once you know all script/style sources.
8. Keep the repo **private** if the league is private — still treat secrets as if public.
