# Deploy

Bombo Gym deploys as a single Docker image (Vite frontend baked in, served by Express) plus a Postgres container, with Caddy on the host handling TLS.

## Architecture

```
Internet ── HTTPS ──> Caddy (host) ── HTTP ──> app:3000 (container) ──> db:5432 (container)
```

- `app` container binds to `127.0.0.1:3000` only — never exposed publicly
- Caddy terminates TLS and reverse-proxies to the app
- Postgres data lives in the `postgres_data` named volume

## Prerequisites on the VM

- Docker + Docker Compose plugin
- Caddy installed and running as a system service
- A DNS A/AAAA record pointing your domain at the VM
- Ports 80 and 443 open

## 1. Clone the repo on the VM

```bash
git clone <repo-url> /opt/bombo-gym
cd /opt/bombo-gym
```

## 2. Set up Google OAuth for production

In Google Cloud Console, add the production redirect URI to your OAuth client:

```
https://gym.example.com/api/auth/callback/google
```

(Replace `gym.example.com` with your domain. You can keep the localhost URI on the same client for dev work.)

## 3. Configure `.env`

Create `.env` at the project root:

```
POSTGRES_DB=bombo_gym
POSTGRES_USERNAME=bombo
POSTGRES_PASSWORD=<strong-random-password>
POSTGRES_PORT=5432

GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

BETTER_AUTH_SECRET=<openssl rand -hex 32>

APP_URL=https://gym.example.com
```

`docker-compose.yml` interpolates these into both the `db` and `app` containers. The app builds `DATABASE_URL` from the Postgres parts internally.

Lock down permissions:

```bash
chmod 600 .env
```

## 4. Configure Caddy

Edit `Caddyfile` to use your domain (the repo ships with `gym.example.com` as a placeholder):

```
gym.example.com {
    reverse_proxy localhost:3000

    @immutable {
        path /assets/*
    }
    header @immutable Cache-Control "public, max-age=31536000, immutable"
}
```

Install it system-wide:

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy will request and renew Let's Encrypt certificates automatically.

## 5. Build and start

```bash
docker compose up --build -d
```

This will:
1. Build the multi-stage image (Vite frontend → Node runtime with the server)
2. Start Postgres and wait for the healthcheck
3. Start the app — which runs pending migrations on boot and then listens on `:3000`

Check logs:

```bash
docker compose logs -f app
docker compose logs -f db
```

## 6. Verify

```bash
curl -I https://gym.example.com           # 200 from the SPA
curl -I https://gym.example.com/api/auth/session   # 200 from better-auth
```

Open the site in a browser, sign in with Google, and you should land on `/settings` for first-time profile setup.

## Updating

```bash
cd /opt/bombo-gym
git pull
docker compose up --build -d
```

Migrations in `server/migrations/` apply automatically on container start. They are tracked in the `_migrations` table — never edit a migration that has already run; add a new file with the next number.

## Backups

Postgres data lives in the `postgres_data` Docker volume. Snapshot it on a schedule:

```bash
docker compose exec -T db pg_dump -U "$POSTGRES_USERNAME" "$POSTGRES_DB" \
  | gzip > "backup-$(date +%F).sql.gz"
```

Wire that into a cron job and ship the file off-host.

Restore:

```bash
gunzip -c backup-YYYY-MM-DD.sql.gz \
  | docker compose exec -T db psql -U "$POSTGRES_USERNAME" "$POSTGRES_DB"
```

## Troubleshooting

- **502 from Caddy** — app container isn't up. `docker compose ps` and check `logs app`.
- **OAuth callback fails with `redirect_uri_mismatch`** — the URI in Google Cloud must match `${APP_URL}/api/auth/callback/google` exactly.
- **Session cookie not set** — `APP_URL` must be the actual public URL (https, no trailing slash). better-auth derives cookie domain and CSRF from it.
- **Migrations stuck** — open a psql shell (`docker compose exec db psql -U ...`) and inspect the `_migrations` table. Delete a row to force a re-run on next boot.
- **Port 3000 reachable from the internet** — `docker-compose.yml` binds to `127.0.0.1:3000`. If yours doesn't, fix that before going live.

## Rollback

The image is rebuilt from git on every deploy, so rollback is a `git checkout` of the previous commit followed by `docker compose up --build -d`. There's no image registry or tagging strategy — keep that in mind if you need a faster rollback path.
