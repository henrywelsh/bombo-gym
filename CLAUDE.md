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

ADMIN_EMAIL=                       # Google account allowed to edit the shared challenge

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

The app has two parts. (1) A **shared daily challenge**: one global list of exercises with daily rep targets (`daily_exercises`, owner-locked — only `ADMIN_EMAIL` can edit), against which each user logs reps that accumulate into one row per user/day/exercise (`daily_progress`). A public **leaderboard** charts everyone's counts for the day (one color per user), shows **per-exercise streaks** (consecutive days a user hit that exercise's target), and ranks users by **per-exercise completion %** — days a target was hit ÷ days since they joined. (2) A **private workout tracker** split into plan → perform: each user builds reusable **plans** (ordered groups — a single exercise, a superset, or a circuit run for N rounds, with optional targets) from a shared, extensible exercise catalog, then **records a session** from a plan, entering per-round actuals. Every exercise tracks reps plus a customizable secondary `metric` (weight, duration, or none) defined on the catalog entry. Sessions store a self-contained JSONB snapshot so history survives plan/catalog edits.

**Auth & routing** — `src/App.jsx` is the app shell. It exports `authClient` (better-auth React client) and provides `AuthContext` (`user`, `loading`) via `AuthProvider`, which uses `authClient.useSession()`. A `RequireAuth` guard wraps all routes: unauthenticated users see the login page, everyone else goes straight in (no profile/setup gate). Login uses `authClient.signIn.social({ provider: 'google' })`; sign-out lives in `NavBar`.

**Routes** — Three pages under `src/pages/`:
- `/` → Today (shared challenge, my `count / target` per exercise with quick-add buttons, per-exercise streaks; the inline challenge editor renders only for the owner, gated on `GET /api/me`'s `isAdmin`)
- `/workouts` → Workouts (private: build reusable plans from single exercises / supersets / circuits with per-metric targets; "Start" a plan to record per-round actuals; browse session history)
- `/board` → Leaderboard (Recharts grouped bar chart by exercise with one color per user + standings with per-exercise completion % (days hit ÷ days since joining) and per-exercise streaks)

**Frontend data layer** — `src/lib/programQueries.js` exports the data functions: daily challenge (`getDailyExercises`, `addDailyExercise`, `updateDailyExercise`, `deleteDailyExercise`, `getTodayProgress`, `addReps`, `getBoard`, `getMe`) and workout tracker (`getExercises`, `addExercise`, `getPlans`, `createPlan`, `deletePlan`, `getSessions`, `createSession`, `deleteSession`). They call `src/lib/apiClient.js`, a thin `fetch` wrapper that always sends `credentials: 'include'` for the session cookie. The server derives identity from the session.

**Express server** (`server/`) — Entry point is `server/index.js`. Before `app.listen()`, it calls `runMigrations()` from `server/migrate.js`, which applies pending SQL files from `server/migrations/` (the explicit `files` list) and tracks them in a `_migrations` table. Seven routers, all behind `server/middleware/requireAuth.js` (which sets `req.userId`/`req.userEmail`): `routes/me.js` (`GET /me` → `{ email, isAdmin }`), `routes/dailyExercises.js` (GET open to any user; POST/PUT/DELETE gated by `server/middleware/requireAdmin.js`, which checks `req.userEmail` against `ADMIN_EMAIL`), `routes/progress.js` (my reps: GET today, POST upsert-increment), `routes/board.js` (leaderboard: per-day counts for the chart + per-exercise streaks + since-join completion stats for every user who has ever participated), `routes/exercises.js` (shared catalog with `metric`: GET, POST upsert), `routes/plans.js` (my reusable plans with nested groups/exercises, POST a full plan in one transaction, DELETE), `routes/sessions.js` (my recorded sessions: GET, POST a JSONB snapshot, DELETE). better-auth owns all `/api/auth/*` traffic via `toNodeHandler(auth)` — this mount must come before `express.json()`.

**Database** — Migrations: `001_base_schema.sql` (auth tables + `daily_exercises`/`daily_progress`), `002_seed.sql` (Pullups 30, Pushups 100), `003_workouts.sql` (`exercises` catalog + seed), `004_workout_plans.sql` (adds `exercises.metric`; replaces the flat 003 workout tables with `workout_plans` → `workout_plan_groups` → `workout_plan_exercises` and a `workout_sessions` table holding a JSONB snapshot). The `"user"` table (better-auth's) is pre-created. There is no `profiles` table — display name/avatar come from `"user".name`/`.image`. Daily-challenge writes (`/api/progress`) and all workout-tracker reads/writes are scoped to `req.userId`; the board reads `daily_progress` across all users. `001`/`002` were rewritten in place during the rebuild (no production data) and `003` is additive — reset a local DB with `docker compose -f docker-compose-lcl.yml down -v`. The original Supabase schema in `supabase/` is kept for historical reference only.

**Deployment** — `docker-compose.yml` is the prod stack: `db` (postgres:16-alpine) and `app` (multi-stage build via `Dockerfile`: Vite frontend baked into a Node runtime image that also serves the Express API). The app container binds to `127.0.0.1:3000` only; Caddy on the VM handles TLS and proxies to it. See `Caddyfile` for the Caddy config and `DEPLOY.md` for the full procedure. `docker-compose-lcl.yml` is the local-dev counterpart and uses raw `node:22-alpine` images with bind mounts instead of building.

**UI** — Tailwind CSS with a custom amber brand palette (`amber-50` through `amber-600` in `tailwind.config.js`). No component library — all components are hand-built. Nav is a bottom bar on mobile and a top bar on `md:` and above.

## Key Documentation

- `README.md` — project overview and pointers to the rest of the docs
- `QUICKSTART.md` — local-dev setup via `docker-compose-lcl.yml`
- `DEPLOY.md` — VM deployment with Docker Compose + Caddy
