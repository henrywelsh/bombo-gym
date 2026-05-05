# Quickstart

Local development runs entirely in Docker — Postgres, the Express API, and the Vite dev server all live in containers with hot reload. You don't need Node installed on the host.

## Prerequisites

- Docker Desktop (or Docker Engine + Compose plugin)
- A Google Cloud project with OAuth credentials

## 1. Configure Google OAuth

In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials, create an **OAuth client ID** of type *Web application* and add this authorized redirect URI:

```
http://localhost:5173/api/auth/callback/google
```

Vite proxies `/api/*` to the API container, so the browser-facing URL is on port 5173 even though the API itself listens on 3000.

## 2. Configure environment

Copy `.env.example` to `.env` at the project root and fill in the OAuth + secret values:

```
POSTGRES_DB=bombo_gym
POSTGRES_USERNAME=bombo
POSTGRES_PASSWORD=changeme
POSTGRES_HOST=localhost
POSTGRES_PORT=54329                                 # non-default to avoid local clashes

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

BETTER_AUTH_SECRET=...                              # openssl rand -hex 32
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173

APP_URL=http://localhost:5173
```

The same `.env` is read by both the local and prod compose files — compose interpolates `${VAR}` references at startup. The `POSTGRES_HOST`/`POSTGRES_PORT` values aren't used inside the local stack (containers reach the db at `db:5432`) but are kept for parity with prod and host-side tools.

## 3. Bring up the stack

```bash
docker compose -f docker-compose-lcl.yml up
```

First boot is slow (image pulls + `npm install` in both Node containers). Subsequent boots are fast — `node_modules` lives in named volumes.

What you'll see come online:
- `db` — Postgres 16 on `localhost:${POSTGRES_PORT}` (54329 by default)
- `api` — Express on `localhost:3000`, runs migrations on startup, restarts on file changes via `node --watch`
- `web` — Vite dev server on `localhost:5173`, HMR for the React app

Open <http://localhost:5173>, sign in with Google, and you'll land on `/settings` for first-time profile setup.

## Common workflows

**Stop the stack:** `Ctrl-C`, or `docker compose -f docker-compose-lcl.yml down` to also remove containers.

**Reset the database:** `docker compose -f docker-compose-lcl.yml down -v` — the `-v` drops the `postgres_data_lcl` volume so migrations re-run from scratch on next boot.

**Reinstall deps:** delete the `api_node_modules` or `web_node_modules` volume:
```bash
docker compose -f docker-compose-lcl.yml down
docker volume rm bombo-gym_api_node_modules bombo-gym_web_node_modules
docker compose -f docker-compose-lcl.yml up
```

**Open a psql shell** (from inside the db container, so port doesn't matter):
```bash
docker compose -f docker-compose-lcl.yml exec db psql -U bombo bombo_gym
```

**Connect from the host** (e.g. a GUI client) — use `localhost:${POSTGRES_PORT}` (54329 by default).

**Tail logs for one service:**
```bash
docker compose -f docker-compose-lcl.yml logs -f api
```

## Common gotchas

- **OAuth redirect mismatch** — the URI in Google Cloud must match `http://localhost:5173/api/auth/callback/google` exactly. Not `:3000`. Not `https`.
- **Port already in use** — something else is on 3000, 5173, or whatever you set `POSTGRES_PORT` to. `lsof -i :5173` and shut it down, or change the port in `.env`.
- **HMR not picking up file changes** — the local compose sets `CHOKIDAR_USEPOLLING=true` because bind-mount file events are flaky on WSL/Docker Desktop. If you're on native Linux you can drop that for snappier reloads.
- **Migrations didn't apply** — check `docker compose -f docker-compose-lcl.yml logs api` on startup. Migration state lives in the `_migrations` table; delete a row to force a re-run.

## Project layout cheatsheet

```
src/
  App.jsx                  shell, AuthContext, RequireAuth guard
  pages/                   one file per route
  lib/programQueries.js    all data functions called by pages
  lib/apiClient.js         fetch wrapper, sends credentials: 'include'
server/
  index.js                 entry point, mounts routes, runs migrations
  auth.js                  better-auth config (Google provider)
  migrate.js               applies SQL files from migrations/
  middleware/requireAuth.js  resolves session → req.userId
  routes/                  one file per domain (lookup is public)
docker-compose-lcl.yml     local dev (db + api + web, all in containers)
docker-compose.yml         production (db + baked-in app image)
```

## Next steps

- See [USER_GUIDE.md](USER_GUIDE.md) for what each page does
- See [TESTING.md](TESTING.md) for a manual QA checklist
- See [DEPLOY.md](DEPLOY.md) when you're ready to ship
