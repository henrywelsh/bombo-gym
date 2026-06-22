# Bombo Gym

A shared daily-challenge tracker with a private workout log. Everyone works toward the same daily goal — a list of exercises with rep targets (e.g. 30 pullups, 100 pushups), editable by the owner. Log your reps through the day, watch a public leaderboard chart everyone's progress (one color per user), build a per-exercise streak by hitting each target day after day, and climb the standings by your per-exercise completion % (days you hit each target since you joined). Separately, keep your own private workout log: build reusable plans from single exercises, supersets, and circuits (each exercise tracks reps plus weight or duration), then record per-round actuals each time you do one.

## What's in here

React 18 SPA (Vite + Tailwind) on top of an Express API with better-auth for Google OAuth and PostgreSQL for storage. It deploys serverlessly: the SPA on Vercel's CDN and the Express API as a single Vercel function, backed by Supabase Postgres.

```
src/                React SPA — pages, components, API client
server/             Express API (app.js exports it), auth, migrations, routes
server/migrations/  SQL schema (001) and seed data (002)
api/index.js        Vercel serverless function — exports the Express app
scripts/migrate.js  `npm run db:migrate` — applies migrations out of runtime
vercel.json         build config + /api and SPA rewrites
```

## Pages

- `/` — Today: the shared challenge, your `count / target` per exercise with quick-add buttons, per-exercise streaks, and an inline editor for the shared exercise list (owner only)
- `/workouts` — Workouts: build reusable plans (single exercises, supersets, circuits; reps + weight/duration targets), start a plan to record per-round actuals, and browse session history
- `/board` — Leaderboard: a grouped bar chart by exercise (one color per user) plus standings with per-exercise completion % (days hit since joining) and streaks

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — get a dev environment running
- [DEPLOY.md](DEPLOY.md) — deploy to Vercel + Supabase
- [CLAUDE.md](CLAUDE.md) — architecture notes for contributors and Claude Code

## Tech stack

- React 18, React Router 6, Recharts, Tailwind CSS
- Vite 8 (dev server + production build)
- Express 4, better-auth, raw `pg`
- Supabase Postgres
- Vercel (static SPA + serverless function)

No tests, linter, or type checker are configured.

## License

Private / personal project.
