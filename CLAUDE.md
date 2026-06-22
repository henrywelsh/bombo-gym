# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Local development:**
```bash
npm install
npm run db:migrate             # apply pending migrations to Supabase (uses DATABASE_URL_DIRECT)
vercel dev                     # SPA + /api function on :3000, mirrors prod
```
`vercel dev` serves the Vite SPA and the serverless function together on `:3000`. Fallback without the Vercel CLI: `node server/index.js` (API on `:3000`, runs migrations on boot) + `npm run dev` (Vite on `:5173`, proxies `/api` to `:3000` per `vite.config.js`).

**Production:**
```bash
npm run build                  # Build Vite SPA to dist/ (Vercel runs this)
vercel --prod                  # deploy SPA (CDN) + api/index.js (function)
```

Migrations are never run by the app — apply them with `npm run db:migrate`. No test runner, linter, or type checker is configured.

## Environment

Copy `.env.example` to `.env` for local dev; in production set the same keys as Vercel project env vars. Required keys:

```
DATABASE_URL=                      # Supabase Postgres — transaction pooler (:6543) in prod
DATABASE_URL_DIRECT=               # Supabase direct (:5432) — used only by npm run db:migrate

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

ADMIN_EMAIL=                       # Google account allowed to edit the shared challenge

BETTER_AUTH_SECRET=                # openssl rand -hex 32

APP_URL=http://localhost:3000      # public URL of the app; in prod, the https Vercel domain
```

`server/db.js` reads `DATABASE_URL` (the legacy `POSTGRES_*` fallback still works for a local Postgres) and enables TLS for non-localhost hosts with `max: 1` to stay within the Supabase pooler. `scripts/migrate.js` swaps in `DATABASE_URL_DIRECT` for migrations.

Google Cloud Console redirect URIs:
- Local: `http://localhost:3000/api/auth/callback/google` (`vercel dev`)
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

**Express server** (`server/`) — `server/app.js` builds and exports the configured Express app (no `listen`, no migrations, no static serving). It's consumed two ways: `api/index.js` exports it as the Vercel serverless function (prod), and `server/index.js` imports it for the local-dev listen path (runs `runMigrations()` then `app.listen`). Migrations live in `server/migrate.js` — it applies the explicit `files` list from `server/migrations/` and tracks them in a `_migrations` table — but in production they run out-of-band via `npm run db:migrate` (`scripts/migrate.js`), never at function cold-start. Eight routers, all behind `server/middleware/requireAuth.js` (which sets `req.userId`/`req.userEmail`): `routes/me.js` (`GET /me` → `{ email, isAdmin }`), `routes/dailyExercises.js` (GET open to any user; POST/PUT/DELETE gated by `server/middleware/requireAdmin.js`, which checks `req.userEmail` against `ADMIN_EMAIL`), `routes/progress.js` (my reps: GET today, POST upsert-increment), `routes/board.js` (leaderboard: per-day counts for the chart + per-exercise streaks + since-join completion stats for every user who has ever participated), `routes/exercises.js` (shared catalog with `metric`: GET, POST upsert), `routes/plans.js` (my reusable plans with nested groups/exercises, POST a full plan in one transaction, DELETE), `routes/sessions.js` (my recorded sessions: GET, POST a JSONB snapshot, DELETE). better-auth owns all `/api/auth/*` traffic via `toNodeHandler(auth)` — this mount must come before `express.json()`.

**Database** — Migrations: `001_base_schema.sql` (auth tables + `daily_exercises`/`daily_progress`), `002_seed.sql` (Pullups 30, Pushups 100), `003_workouts.sql` (`exercises` catalog + seed), `004_workout_plans.sql` (adds `exercises.metric`; replaces the flat 003 workout tables with `workout_plans` → `workout_plan_groups` → `workout_plan_exercises` and a `workout_sessions` table holding a JSONB snapshot). The `"user"` table (better-auth's) is pre-created. There is no `profiles` table — display name/avatar come from `"user".name`/`.image`. Daily-challenge writes (`/api/progress`) and all workout-tracker reads/writes are scoped to `req.userId`; the board reads `daily_progress` across all users. `001`/`002` were rewritten in place during the rebuild (no production data) and `003` is additive — to reset a dev DB, drop/recreate the schema in the Supabase SQL editor (or use a fresh Supabase branch) and re-run `npm run db:migrate`. The original Supabase schema in `supabase/` is kept for historical reference only.

**Deployment** — Vercel hosts the built SPA (`dist/`, on the CDN) plus a single serverless function (`api/index.js`, the whole Express app); `vercel.json` rewrites `/api/*` to the function and everything else to `index.html` (SPA history fallback). The database is Supabase Postgres — `DATABASE_URL` uses the transaction pooler (:6543) in prod. Migrations apply via `npm run db:migrate` against `DATABASE_URL_DIRECT` (:5432). See `DEPLOY.md` for the full procedure.

**UI** — Tailwind CSS with a custom amber brand palette (`amber-50` through `amber-600` in `tailwind.config.js`). No component library — all components are hand-built. Nav is a bottom bar on mobile and a top bar on `md:` and above.

## Key Documentation

- `README.md` — project overview and pointers to the rest of the docs
- `QUICKSTART.md` — local-dev setup with `vercel dev` + Supabase
- `DEPLOY.md` — deployment to Vercel + Supabase
