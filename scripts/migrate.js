// Standalone migration runner — run with `npm run db:migrate`.
// Migrations never run inside the Vercel function; apply them from here (locally
// or in CI) against the Supabase DIRECT connection (:5432), which is safest for
// DDL and advisory locks. Falls back to DATABASE_URL if no direct URL is set.
if (process.env.DATABASE_URL_DIRECT) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_DIRECT
}

// Dynamic import so the override above lands before db.js reads the env.
const { runMigrations } = await import('../server/migrate.js')
const { pool } = await import('../server/db.js')

try {
  await runMigrations()
  console.log('[migrate] up to date')
} finally {
  await pool.end()
}
