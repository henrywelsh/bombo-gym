# Deploy

Bombo Gym runs on **Vercel** (static Vite SPA on the CDN + one serverless function that
wraps the Express API) backed by **Supabase Postgres**. There is no VM, Docker, or Caddy —
the app is stateless and scales to zero.

## Architecture

```
Browser ── HTTPS ──> Vercel CDN (dist/ static SPA)
                         │  /api/*  (vercel.json rewrite)
                         ▼
              Serverless function  api/index.js  ── the whole Express app
                         │  pg Pool (max:1, TLS)
                         ▼
              Supabase Postgres  (transaction pooler :6543)
                         ▲
                         │  session pooler :5432, manual / CI only
              npm run db:migrate
```

The SPA and `/api/*` share one origin, so the better-auth session cookie works without CORS
config. Migrations never run inside the function — apply them with `npm run db:migrate`.

## 1. Create the Supabase project

1. Create a project at <https://supabase.com>. Pick a strong DB password.
2. **Project → Settings → Database → Connection string** gives you two URLs you need:
   - **Transaction pooler** (port `6543`) → `DATABASE_URL` (used by the app on Vercel).
   - **Session pooler** (port `5432`) → `DATABASE_URL_DIRECT` (used by migrations).
     Prefer this over the **Direct connection** (`db.<ref>.supabase.co:5432`): the
     direct host is IPv6-only and fails with `ENETUNREACH` on IPv4-only networks
     (e.g. WSL2), whereas the session pooler resolves over IPv4 and still gives a
     real session for DDL and advisory locks.
3. Nothing else to configure here — the app owns its own schema via the migration files in
   `server/migrations/`.

## 2. Set up Google OAuth for production

In Google Cloud Console, add the production redirect URI to your OAuth client:

```
https://<your-app>.vercel.app/api/auth/callback/google
```

Keep `http://localhost:3000/api/auth/callback/google` alongside it for local `vercel dev`.

## 3. Import the repo into Vercel

1. `npm i -g vercel` (or use the dashboard "Add New → Project" and import from Git).
2. From the repo root: `vercel link` (or `vercel` to create + link in one go).
3. Vercel auto-detects Vite. `vercel.json` already pins the build (`npm run build`),
   output (`dist`), and the rewrites that send `/api/*` to the function and everything else
   to `index.html` (SPA history fallback).

## 4. Configure environment variables

Set these in **Vercel → Project → Settings → Environment Variables** (Production, and
Preview if you use it):

```
DATABASE_URL          # Supabase transaction pooler (:6543)
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
BETTER_AUTH_SECRET    # openssl rand -hex 32
ADMIN_EMAIL           # Google account allowed to edit the shared challenge
APP_URL               # https://<your-app>.vercel.app  (no trailing slash)
```

`DATABASE_URL_DIRECT` is only needed wherever you run `db:migrate` (your machine or CI), not
in the Vercel runtime.

## 5. Run migrations

Migrations are applied out-of-band against the **session pooler** connection. Locally:

```bash
cp .env.example .env        # fill in DATABASE_URL_DIRECT + the rest
npm install
npm run db:migrate          # applies 001…005, tracked in the _migrations table
```

Re-run after every deploy that adds a migration file. (Or wire it into CI as a post-deploy
step against `DATABASE_URL_DIRECT`.)

## 6. Deploy

```bash
vercel --prod
```

This builds the SPA, uploads `dist/` to the CDN, and deploys `api/index.js` as a function.

## 7. Verify

```bash
curl -I https://<your-app>.vercel.app            # 200, SPA HTML
curl -I https://<your-app>.vercel.app/api/auth/session   # 200 from better-auth
```

Open the site, sign in with Google end-to-end, log reps on Today, and confirm the session
cookie is set and data persists across reloads. In the Supabase SQL editor, confirm
`_migrations` has 5 rows and the `"user"` / `daily_progress` / `workout_*` tables exist.

## Updating

```bash
git push           # if the Vercel Git integration is on, this auto-deploys
# or
vercel --prod      # manual deploy
```

If the push includes a new file in `server/migrations/`, run `npm run db:migrate` against
`DATABASE_URL_DIRECT`. Never edit a migration that has already run — add the next-numbered
file. The list of files to apply lives in `server/migrate.js`.

## Backups

Supabase takes automatic daily backups (retention depends on plan); restore from
**Project → Database → Backups**. For an off-platform copy, `pg_dump` against
`DATABASE_URL_DIRECT` (the session pooler):

```bash
pg_dump "$DATABASE_URL_DIRECT" | gzip > bombo-gym-$(date +%F).sql.gz
```

## Troubleshooting

- **500s with connection / "too many clients" errors** — make sure `DATABASE_URL` is the
  **transaction pooler** (:6543), not the direct connection. The pool is capped at `max:1`
  per instance in `server/db.js`.
- **better-auth errors mentioning prepared statements** — the transaction pooler disallows
  some session-level features. Switch `DATABASE_URL` to the Supabase **session pooler** and
  redeploy.
- **`redirect_uri_mismatch`** — the Google Cloud URI must equal
  `${APP_URL}/api/auth/callback/google` exactly.
- **Session cookie not set** — `APP_URL` must be the public https URL with no trailing slash;
  better-auth derives the cookie domain and CSRF origin from it.
- **TLS / self-signed cert errors connecting to Supabase** — `server/db.js` enables TLS for
  non-localhost hosts; confirm you're not pointing `DATABASE_URL` at `localhost`.
- **Migrations stuck** — inspect the `_migrations` table via the Supabase SQL editor; delete
  a row to force that file to re-run on the next `db:migrate`.

## Rollback

Use the Vercel dashboard (**Deployments → ⋯ → Promote to Production** on a previous
deployment) for an instant rollback of the app. Schema rollbacks are manual — write a new
migration that reverses the change.
