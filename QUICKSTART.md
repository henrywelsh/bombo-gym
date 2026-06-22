# Quickstart

Local development uses **`vercel dev`** — it serves the Vite SPA and the `/api/*`
serverless function together, mirroring production. The database is a **Supabase** project
(use a separate dev project, or a [branch](https://supabase.com/docs/guides/platform/branching)).

## Prerequisites

- Node 22+ and the Vercel CLI (`npm i -g vercel`)
- A Supabase project (free tier is fine)
- A Google Cloud project with OAuth credentials

## 1. Configure Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials,
create an **OAuth client ID** of type *Web application* and add this authorized redirect URI:

```
http://localhost:3000/api/auth/callback/google
```

`vercel dev` serves both the app and the API on port 3000, so the redirect stays on 3000.

## 2. Configure environment

Copy `.env.example` to `.env` and fill it in:

```
DATABASE_URL=...            # Supabase connection string (transaction pooler :6543)
DATABASE_URL_DIRECT=...     # Supabase session pooler (:5432) for migrations — IPv4, unlike
                            # the IPv6-only direct host (which fails on WSL2 etc.)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
BETTER_AUTH_SECRET=...      # openssl rand -hex 32
ADMIN_EMAIL=you@example.com
APP_URL=http://localhost:3000
```

Both connection strings come from **Supabase → Settings → Database → Connection string**.

## 3. Install deps and run migrations

```bash
npm install
npm run db:migrate          # applies 001…005 against DATABASE_URL_DIRECT
```

`db:migrate` is idempotent — it tracks applied files in the `_migrations` table and skips
ones already run.

## 4. Run the app

```bash
vercel dev
```

First run prompts you to link a Vercel project (pick or create one). Then open
<http://localhost:3000> and sign in with Google.

> Fallback without the Vercel CLI: run the API and SPA separately —
> `node server/index.js` (serves `/api` on :3000 and applies migrations on boot) plus
> `npm run dev` (Vite on :5173, proxies `/api` to :3000 per `vite.config.js`). With this
> path set `APP_URL=http://localhost:5173` and use the `:5173` Google redirect URI.

## Common workflows

**Reset the database:** drop and re-create the schema in the Supabase SQL editor (or use a
fresh branch), then `npm run db:migrate` again.

**Open a SQL shell:** use the Supabase dashboard SQL editor, or `psql "$DATABASE_URL_DIRECT"`.

**Add a migration:** drop a new `NNN_*.sql` file in `server/migrations/`, add it to the
`files` list in `server/migrate.js`, then `npm run db:migrate`.

## Common gotchas

- **OAuth redirect mismatch** — the Google Cloud URI must match
  `http://localhost:3000/api/auth/callback/google` exactly (or `:5173` on the fallback path).
- **TLS error connecting to Supabase** — `server/db.js` enables TLS for non-localhost hosts;
  make sure `DATABASE_URL` points at Supabase, not `localhost`.
- **Migrations didn't apply** — inspect the `_migrations` table; delete a row to force a
  re-run on the next `npm run db:migrate`.

## Project layout cheatsheet

```
src/
  App.jsx                  shell, AuthContext, RequireAuth guard
  pages/                   one file per route
  lib/programQueries.js    all data functions called by pages
  lib/apiClient.js         fetch wrapper, sends credentials: 'include'
server/
  app.js                   builds + exports the Express app (no listen)
  index.js                 local-dev entry: runs migrations + app.listen
  auth.js                  better-auth config (Google provider)
  migrate.js               applies SQL files from migrations/
  middleware/requireAuth.js  resolves session → req.userId
  routes/                  one file per domain
api/index.js               Vercel function — exports the Express app
scripts/migrate.js         `npm run db:migrate` entry (uses DATABASE_URL_DIRECT)
vercel.json                build + /api and SPA rewrites
```

## Next steps

- See [DEPLOY.md](DEPLOY.md) when you're ready to ship to Vercel + Supabase
