# Batch 16

Private Fantasy Premier League HQ for our friends’ league — standings, live scores, side bets (**Baaji**), Dressing Room chat, awards, and a bit of weekly theatre.

Built for managers who already know each other. Not a public product.

---

## What you can do in the app

| Area | What it is |
|------|------------|
| **League** | Table, pitch ranks, fixtures, fees, balances |
| **Live** | Match-centre style scores while the gameweek is on |
| **Baaji** | Side bets between managers |
| **Rivalries** | Who owns who, historically |
| **Awards** | Weekly shout-outs |
| **Documentary** | Auto episodes after finished gameweeks |
| **Dressing Room** | League chat + taunts |
| **Past seasons** | Historical winners & prizes |
| **Guide** | In-app FAQ / how-to for players |

> **Penalties** (shootout mini-game) is archived under `archive/penalties/` until we leave free-tier Supabase limits.

Players: open **Guide** in the app (`/guide`) after you sign in.  
Developers: see **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## Screenshots

Add PNGs under `docs/screenshots/` and link them here when you have a spare minute (League table, Live, Baaji, Dressing Room work well).

```markdown
![League table](docs/screenshots/league.png)
![Dressing Room](docs/screenshots/dressing-room.png)
```

Until then, run the app locally and click around — the UI is the best demo.

<p align="center">
  <img src="public/brand/batch16-logo.svg" alt="Batch 16 crest" width="96" />
</p>

---

## Quick start

```bash
npm install
cp .env.example .env.local   # fill in real values — never commit this file
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full local setup, folder map, PR process: **[CONTRIBUTING.md](./CONTRIBUTING.md)**.

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** + **React 19**  
- **Tailwind CSS v4** + **shadcn/ui** + **Framer Motion**  
- **Supabase** (Auth, Postgres, Realtime) + **Drizzle ORM**  
- Official **FPL** API (server-side)  
- **Vitest** for unit tests  

---

## Environment

Copy [`.env.example`](./.env.example) → `.env.local`.

| Variable | Required | Where it comes from |
|----------|----------|---------------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Settings → API |
| `DATABASE_URL` | Yes | Supabase → Database → **Transaction** pooler (port **6543**) |
| `FPL_LEAGUE_ID` | Yes | Classic league ID on FPL |
| `ADMIN_EMAILS` | For `/admin` | Your email(s), comma-separated |
| `NEXT_PUBLIC_SITE_URL` | Production | Deployed site URL (auth redirects) |

Never commit secrets. See **[SECURITY.md](./SECURITY.md)**.

### Supabase Auth (local + prod)

1. Add redirect URL: `http://localhost:3000/auth/callback` (and your production `/auth/callback`)  
2. Set Site URL appropriately for each environment  
3. Enable email confirmation if you use the register → confirm → login flow  
4. Turn on **Realtime** for Dressing Room / notifications  

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest |
| `npm run security:check` | Scan for tracked secrets |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:indexes` | Apply performance indexes (`0015`) if migrate hangs |
| `npm run db:studio` | Browse the database |

---

## How accounts work (short)

1. Admin syncs managers from FPL → they appear **Unverified**  
2. You register, confirm email, sign in  
3. You **claim** your seat (`/auth/claim`) with name + FPL team name → **Verified**  
4. Verified unlocks chat, Baaji, notifications, etc.  
5. **Paid / Unpaid** is only the entry fee (admin flag) — separate from Verified  

Gameweek winners are only auto-declared after FPL finishes and data-checks the week (or an admin confirms). Unplayed weeks don’t invent a winner.

---

## Admin

Emails in `ADMIN_EMAILS` can open `/admin` to:

- Sync / edit managers and entry fees  
- Confirm weekly winners and recalculate balances  
- Edit prize config, awards, wall moderation  
- Import past seasons from Excel under `data/imports/`  

---

## Contributing

We want league mates who know a bit of coding to feel safe opening PRs.

→ **[CONTRIBUTING.md](./CONTRIBUTING.md)** — local setup, folders, branches, tests, PR etiquette  

→ **[SECURITY.md](./SECURITY.md)** — secrets, auth hardening, RLS  

Before every push:

```bash
npm run typecheck && npm test && npm run security:check
```

---

## Production checklist

- [ ] Env vars set on the host (`ADMIN_EMAILS`, `NEXT_PUBLIC_SITE_URL`, …)  
- [ ] Migrations applied (including RLS in `drizzle/0014_rls_policies.sql` and indexes in `drizzle/0015_performance_indexes.sql` if not already)  
- [ ] Supabase Auth redirects + Realtime configured  
- [ ] `typecheck` / `test` / `security:check` / `build` pass  
- [ ] Register → confirm → login → claim works once end-to-end  

---

## Licence / privacy

Private league project. Keep the repo access limited to people in the league unless you explicitly decide otherwise. Don’t share `.env.local` or production database credentials in chat screenshots.
