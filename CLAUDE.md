# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Local development:**
```bash
docker compose -f docker-compose-lcl.yml up      # db + api + web, hot reload
docker compose -f docker-compose-lcl.yml down -v # stop and reset DB
```
Brings up Postgres on `:5432`, the Express API on `:3000`, and the Vite dev server on `:5173`. The api container runs `node --watch index.js` against bind-mounted `./server`; the web container runs the Vite dev server with bind-mounted source and proxies `/api/*` to `http://api:3000` via the `VITE_API_PROXY` env var. `node_modules` for each Node service lives in a named volume. Open the SPA at <http://localhost:5173>.

**Production:**
```bash
npm run build                  # Build Vite SPA to dist/ (used inside Dockerfile)
docker compose up --build      # docker-compose.yml — builds the prod image and starts app + db
```

No test runner, linter, or type checker is configured.

## Environment

Copy `.env.example` to `.env` at the project root. Both compose files read it for variable substitution (`${VAR}`); nothing on the host needs `dotenv`. Required keys:

```
POSTGRES_DB=bombo_gym
POSTGRES_USERNAME=bombo
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=localhost            # not used inside compose; kept for parity / host tools
POSTGRES_PORT=54329                # host-side port; inside the db container Postgres still listens on 5432

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

BETTER_AUTH_SECRET=                # openssl rand -hex 32
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173

APP_URL=http://localhost:5173      # public URL of the SPA; in prod, the https domain
```

`server/db.js` builds the connection string from the `POSTGRES_*` parts when `DATABASE_URL` is unset; both compose files set `DATABASE_URL` explicitly (with `host=db`).

Google Cloud Console redirect URIs:
- Local: `http://localhost:5173/api/auth/callback/google` (browser hits Vite, which proxies to api)
- Prod: `${APP_URL}/api/auth/callback/google`

## Architecture

React 18 SPA (JSX, no TypeScript) built with Vite, styled with Tailwind CSS. Backend is an Express server with better-auth for Google OAuth and raw `pg` queries to PostgreSQL.

**Auth & routing** — `src/App.jsx` is the app shell. It exports `authClient` (better-auth React client) and provides `AuthContext` (user session, profile, `refreshProfile()`) via `AuthProvider`, which uses `authClient.useSession()`. A `RequireAuth` guard wraps all routes: unauthenticated users see the login page; authenticated users with no `program_start_date` are redirected to `/settings` for first-time setup. Login uses `authClient.signIn.social({ provider: 'google' })`.

**Routes** — Five pages under `src/pages/`:
- `/` → Dashboard (today's split, daily staples)
- `/log` → LogSession (exercise logging with upsert)
- `/progress` → Progress (Recharts graphs of strength & body weight)
- `/nutrition` → Nutrition (meal planner, supplements, measurements)
- `/settings` → Settings (profile, supplements, sign out)

**Frontend data layer** — `src/lib/programQueries.js` exports all data functions (same signatures as before). They call `src/lib/apiClient.js`, a thin `fetch` wrapper that always sends `credentials: 'include'` for the session cookie. All `userId` parameters in `programQueries.js` are ignored — the server derives identity from the session.

**Express server** (`server/`) — Entry point is `server/index.js`. Before `app.listen()`, it calls `runMigrations()` from `server/migrate.js`, which applies any pending SQL files from `server/migrations/` and tracks them in a `_migrations` table. Routes are split by domain: `server/routes/lookup.js` (public, no auth) and one file per user-data domain (all protected by `server/middleware/requireAuth.js`). better-auth owns all `/api/auth/*` traffic via `toNodeHandler(auth)` — this mount must come before `express.json()`.

**Database** — Schema is in `server/migrations/001_base_schema.sql`; seed data in `server/migrations/002_seed.sql`. The `"user"` table (better-auth's auth table) is pre-created in the schema migration so `profiles` can reference it. All user tables use `user_id TEXT` referencing `"user"(id)` — no RLS, authorization is enforced in route handlers via `WHERE user_id = req.userId`. The original Supabase schema in `supabase/` is kept for historical reference only.

**Deployment** — `docker-compose.yml` is the prod stack: `db` (postgres:16-alpine) and `app` (multi-stage build via `Dockerfile`: Vite frontend baked into a Node runtime image that also serves the Express API). The app container binds to `127.0.0.1:3000` only; Caddy on the VM handles TLS and proxies to it. See `Caddyfile` for the Caddy config and `DEPLOY.md` for the full procedure. `docker-compose-lcl.yml` is the local-dev counterpart and uses raw `node:22-alpine` images with bind mounts instead of building.

**UI** — Tailwind CSS with a custom amber brand palette (`amber-50` through `amber-600` in `tailwind.config.js`). No component library — all components are hand-built. Nav is a bottom bar on mobile and a top bar on `md:` and above.

## Key Documentation

- `README.md` — project overview and pointers to the rest of the docs
- `QUICKSTART.md` — local-dev setup via `docker-compose-lcl.yml`
- `DEPLOY.md` — VM deployment with Docker Compose + Caddy
- `USER_GUIDE.md` — full feature walkthrough, program structure, and progression tables
- `TESTING.md` — section-by-section QA guide (references Supabase; API endpoints have changed but feature behavior is identical)
- `Lean Mass & Athletic Conditioning Program.pdf` — the source fitness program this app implements
