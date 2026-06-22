# Bombo Gym

A shared daily-challenge tracker with a private workout log. Everyone works toward the same daily goal — a list of exercises with rep targets (e.g. 30 pullups, 100 pushups), editable by the owner. Log your reps through the day, watch a public board chart everyone's progress, and build a per-exercise streak by hitting each target day after day. Separately, keep your own workout history — build sessions from single exercises, supersets, and circuits.

## What's in here

React 18 SPA (Vite + Tailwind) on top of an Express API with better-auth for Google OAuth and PostgreSQL for storage. Frontend and backend live side by side and ship as a single Docker image.

```
src/                React SPA — pages, components, API client
server/             Express API, auth, migrations, route handlers
server/migrations/  SQL schema (001) and seed data (002)
Dockerfile          Multi-stage build: Vite → Node runtime
docker-compose.yml  App + Postgres for production
Caddyfile          TLS reverse proxy for the VM
```

## Pages

- `/` — Today: the shared challenge, your `count / target` per exercise with quick-add buttons, per-exercise streaks, and an inline editor for the shared exercise list (owner only)
- `/workouts` — Workouts: build a private workout from single exercises, supersets, and circuits, then browse your history
- `/board` — Daily board: a grouped bar chart of every user's counts for the day plus per-exercise streaks

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — get a dev environment running
- [DEPLOY.md](DEPLOY.md) — deploy to a VM with Docker + Caddy
- [CLAUDE.md](CLAUDE.md) — architecture notes for contributors and Claude Code

## Tech stack

- React 18, React Router 6, Recharts, Tailwind CSS
- Vite 8 (dev server + production build)
- Express 4, better-auth, raw `pg`
- PostgreSQL 16
- Docker Compose, Caddy (TLS)

No tests, linter, or type checker are configured.

## License

Private / personal project.
