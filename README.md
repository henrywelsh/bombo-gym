# Bombo Gym

A personal training tracker built around the *Lean Mass & Athletic Conditioning Program* — a 12-month kettlebell strength and conditioning plan. Bombo Gym tells you what to train each day, lets you log sets and meals, and graphs your progress over time.

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

- `/` — Dashboard: today's split, exercise cards with current targets, daily staples
- `/log` — Log sets (upserts on `(user, exercise, date)`)
- `/progress` — Recharts graphs of strength and body weight
- `/nutrition` — Meal planner, supplements, body measurements
- `/settings` — Profile, program start date, supplements, sign out

## Documentation

- [QUICKSTART.md](QUICKSTART.md) — get a dev environment running
- [DEPLOY.md](DEPLOY.md) — deploy to a VM with Docker + Caddy
- [USER_GUIDE.md](USER_GUIDE.md) — end-user feature walkthrough
- [TESTING.md](TESTING.md) — manual QA checklist
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
