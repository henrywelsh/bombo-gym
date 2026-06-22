import pg from 'pg'

const { Pool } = pg

const {
  DATABASE_URL,
  POSTGRES_HOST,
  POSTGRES_PORT,
  POSTGRES_USERNAME,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
} = process.env

const connectionString = DATABASE_URL
  || `postgres://${POSTGRES_USERNAME}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`

// Supabase requires TLS; a local Postgres does not. Detect by host.
const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString)

export const pool = new Pool({
  connectionString,
  // One connection per warm serverless instance so we don't exhaust the Supabase
  // pooler; better-auth shares this same pool.
  max: 1,
  ssl: isLocal ? false : { rejectUnauthorized: false },
})
