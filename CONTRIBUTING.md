# Contributing to Batch 16

Thanks for wanting to help. This is a **private friends’ FPL league app** — not a startup product. If you can open a PR and run `npm run dev`, you’re welcome here.

You don’t need to be a full-time engineer. Small fixes, copy tweaks, UI polish, and “this button is confusing” PRs all count.

---

## What this app is

**Batch 16** tracks our classic Fantasy Premier League mini-league:

- Standings, pitch ranks, live scores, and prize balances  
- Side bets (**Baaji**), rivalries, penalty shootouts  
- Dressing Room chat, awards, documentary episodes  
- Auth so each manager can **claim** their FPL seat and become **Verified**

Players use the in-app **Guide** at `/guide` for how features work. This file is for **people changing the code**.

---

## Tech stack

| Layer | Choice |
|--------|--------|
| Framework | **Next.js 15** (App Router) |
| Language | **TypeScript** |
| UI | **React 19**, **Tailwind CSS v4**, **shadcn/ui** (Base UI), **Framer Motion** |
| Database | **Postgres** via **Supabase** + **Drizzle ORM** |
| Auth / Realtime | **Supabase Auth** + Realtime (Dressing Room, notifications) |
| External API | Official **FPL** JSON API (server-side only) |
| Tests | **Vitest** (unit tests for pure logic) |

Server code that talks to the DB or FPL lives under `lib/` and uses `"server-only"` where needed. UI lives under `components/` and `app/`.

---

## Prerequisites

- **Node.js 20+** (LTS is fine)  
- **npm** (comes with Node)  
- Access to the team’s Supabase project (or your own for experiments)  
- Your FPL classic league ID  

Ask an admin for env values if you’re a league member contributing — **never** commit real secrets.

---

## Run locally

```bash
# 1. Clone and install
git clone <repo-url>
cd batch16
npm install

# 2. Environment
cp .env.example .env.local
# Edit .env.local with real values (see below)

# 3. Database schema
npm run db:migrate

# 4. Dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Optional:

```bash
npm run db:studio    # browse tables in Drizzle Studio
```

### First-time checklist

1. Fill every **required** variable in `.env.local`  
2. In Supabase Auth, allow `http://localhost:3000/auth/callback` as a redirect URL  
3. Sync managers from **Admin → Managers** (admin email must be in `ADMIN_EMAILS`)  
4. Register → confirm email → claim your manager at `/auth/claim`  

---

## Environment variables

**Source of truth:** [`.env.example`](./.env.example)

Copy it to `.env.local` (gitignored). Never commit `.env.local` or real passwords/keys.

| Variable | Required | Notes |
|----------|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Project URL only (no `/rest/v1/`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Public anon key — OK in the browser |
| `DATABASE_URL` | Yes | Transaction pooler Postgres URI (port **6543**) — **server only** |
| `FPL_LEAGUE_ID` | Yes | Classic league ID from FPL |
| `ADMIN_EMAILS` | Yes for admin | Comma-separated emails for `/admin` |
| `NEXT_PUBLIC_SITE_URL` | Prod / redirects | e.g. `https://your-app.vercel.app` |

**Do not** put a Supabase `service_role` key in this app. The server uses `DATABASE_URL` through Drizzle instead.

More detail: [SECURITY.md](./SECURITY.md).

---

## Folder structure (overview)

```text
batch16/
├── app/                 # Next.js routes (pages + API + server actions)
│   ├── api/             # Route handlers (chat, live, notifications, …)
│   ├── admin/           # Admin UI + actions
│   ├── auth/            # Login, register, claim, callback
│   ├── guide/           # In-app Guide / FAQ
│   ├── league/, live/, challenges/, …  # Feature pages
│   └── layout.tsx       # Root layout
├── components/          # React UI (by feature: league, chat, …)
│   └── ui/              # Shared shadcn primitives
├── lib/                 # Business logic (prefer here over fat pages)
│   ├── db/              # Drizzle schema + connection
│   ├── fpl/             # FPL API client
│   ├── league/, chat/, challenges/, … 
│   ├── auth/, security/, supabase/
│   └── *.test.ts        # Vitest unit tests next to logic
├── drizzle/             # SQL migrations
├── scripts/             # Ops helpers (e.g. security:check)
├── public/              # Static assets (logo, favicon)
├── data/imports/        # Excel files for historical import (gitignored contents)
├── middleware.ts        # Auth gate + admin path protection
├── CONTRIBUTING.md      # You are here
├── SECURITY.md
└── README.md
```

**Rule of thumb**

- New **page** → `app/<feature>/page.tsx`  
- New **UI** → `components/<feature>/…`  
- New **rules / DB / FPL** → `lib/<feature>/…`  
- Schema change → update `lib/db/schema.ts`, then `npm run db:generate` (or add SQL under `drizzle/` carefully)

---

## Branching & creating a feature

We use short-lived branches off `main` (or whatever the default branch is).

```bash
git checkout main
git pull

# Name the branch after what you're doing
git checkout -b fix/guide-typo
# or
git checkout -b feat/baaji-copy
# or
git checkout -b chore/readme-screenshots
```

Suggested prefixes:

| Prefix | Use for |
|--------|---------|
| `feat/` | New behaviour or UI |
| `fix/` | Bug fixes |
| `chore/` | Docs, deps, tidy-ups |
| `refactor/` | Internal cleanup, same behaviour |

Keep PRs **small** when you can — one idea per PR is easier to review after a gameweek when everyone’s tired.

---

## Coding standards

Match the code that’s already there. In practice:

1. **TypeScript** — avoid `any`; prefer existing types in `lib/*/types.ts`.  
2. **Server vs client** — default to Server Components. Add `"use client"` only when you need hooks, browser APIs, or interactivity.  
3. **Secrets** — env vars only; run `npm run security:check` before pushing.  
4. **Auth**  
   - Writes that act as a manager → `getActingManagerId()` / `requireActingLeagueManager` (Verified only).  
   - Admin mutations → `requireAdmin` / admin action guard.  
5. **Inputs** — validate length and sanitise user text (see `lib/security/`).  
6. **UI** — reuse `components/ui/*`, `PageHeader`, and existing motion helpers; don’t invent a new design system for one screen.  
7. **Scope** — change only what’s needed for the task (no drive-by renames of unrelated files).  
8. **Comments** — explain *why* when something is non-obvious; skip noise.  

Formatting: follow the project’s ESLint / Prettier-via-eslint setup (`npm run lint`).

---

## How to test your changes

Before you open a PR:

```bash
npm run typecheck      # TypeScript
npm test               # Vitest unit tests
npm run lint           # ESLint
npm run security:check # No accidental secrets
npm run build          # Optional but great before bigger changes
```

### Manual checks (pick what applies)

| Change area | Try this locally |
|-------------|------------------|
| League / live | Open `/league` and `/live`; confirm empty/error states still look OK |
| Auth | Register / login / claim on a throwaway account if you can |
| Baaji | Create + accept as a Verified manager |
| Chat | Post in Dressing Room; confirm unverified can’t post |
| Admin | Only if your email is in `ADMIN_EMAILS` |
| Docs | Click links in README / Guide |

Unit tests live next to logic, e.g. `lib/league/weekly.test.ts`. Prefer testing **pure functions** (winners, sanitise, claim matching) over full browser E2E unless we add Playwright later.

---

## Pull request process

1. Push your branch and open a PR against `main`.  
2. Fill in a short description:
   - **What** changed  
   - **Why** (bug? league request?)  
   - **How you tested**  
3. Screenshots or a short Loom help for UI changes.  
4. Make sure checks above pass (`typecheck`, `test`, `lint`, `security:check`).  
5. Ask another league mate (or the main maintainer) to glance at it.  
6. Squash or merge once approved — follow whatever the repo’s GitHub settings use.

### PR title examples

- `fix: don't crown GW winners before FPL settles`  
- `feat: add Guide page to the nav`  
- `chore: document contributing for league mates`  

---

## What contributions are welcome

**Yes please**

- Bug fixes (especially around winners, auth, mobile layout)  
- Clearer copy in Guide / empty states  
- Small UI/UX improvements that match existing style  
- Tests for pure logic you touch  
- Docs (README, CONTRIBUTING, SECURITY, Guide content)  
- Accessibility and performance tweaks  

**Ask first (open an issue or message the group)**

- Large refactors  
- New major features (new games, public marketing site, native apps)  
- Dependency upgrades that change auth or DB behaviour  
- Anything that touches money / prize calculation formulas  

**Please don’t**

- Commit `.env.local`, keys, or personal file paths  
- Bypass Verified / admin checks “just for testing” in committed code  
- Add `service_role` keys or disable auth in production paths  

---

## Getting help

- In-app: **Guide** at `/guide` for product behaviour  
- Repo: [SECURITY.md](./SECURITY.md) for secrets / hardening  
- People: ask in the Dressing Room or the league chat — we’re friends first  

Thanks for contributing to Batch 16. May your captain haul and your PRs be small.
