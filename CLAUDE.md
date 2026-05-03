# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server at http://localhost:5173
npm run build     # Production build
npm run preview   # Preview production build locally
```

No test runner, linter, or type checker is configured.

## Environment

Copy `.env.example` to `.env` and fill in:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Architecture

React 18 SPA (JSX, no TypeScript) built with Vite, styled with Tailwind CSS, backed entirely by Supabase (PostgreSQL + Auth).

**Auth & routing** — `src/App.jsx` is the app shell. It provides `AuthContext` (user session, profile, `refreshProfile()`) via `AuthProvider`, which listens to `supabase.auth.onAuthStateChange`. A `RequireAuth` guard wraps all routes: unauthenticated users are redirected to the login page; authenticated users with no `program_start_date` are redirected to `/settings` for first-time setup. Login uses Google OAuth (redirect flow) via Supabase.

**Routes** — Five pages under `src/pages/`:
- `/` → Dashboard (today's split, daily staples)
- `/log` → LogSession (exercise logging with upsert)
- `/progress` → Progress (Recharts graphs of strength & body weight)
- `/nutrition` → Nutrition (meal planner, supplements, measurements)
- `/settings` → Settings (profile, supplements, sign out)

**Data layer** — All Supabase queries are centralized in `src/lib/programQueries.js`. Progression milestone logic lives in `src/lib/progressionUtils.js`. The Supabase client is initialized once in `src/supabaseClient.js` from `VITE_*` env vars.

**Database** — Schema and RLS policies are in `supabase/migrations/001_schema.sql`; seed data (exercises, splits, mobility routines, default milestones) is in `supabase/seed.sql`. Shared lookup tables (`exercises`, `weekly_split_days`, `mobility_routines`, `exercise_milestones` where `user_id IS NULL`) have no RLS. All user data tables (`profiles`, `exercise_logs`, `meal_plans`, `user_supplements`, etc.) are RLS-protected by `auth.uid()`. A database trigger auto-creates a `profiles` row on new user signup.

**UI** — Tailwind CSS with a custom amber brand palette (`amber-50` through `amber-600` in `tailwind.config.js`). No component library — all components are hand-built. Nav is a bottom bar on mobile and a top bar on `md:` and above.

## Key Documentation

- `USER_GUIDE.md` — full feature walkthrough, program structure, and progression tables
- `TESTING.md` — section-by-section QA guide with expected Supabase states
- `Lean Mass & Athletic Conditioning Program.pdf` — the source fitness program this app implements
