-- ============================================================
-- better-auth tables
-- Pre-created here so app tables can reference "user"(id).
-- better-auth skips creation when it finds these already exist.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "user" (
  id              TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image           TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session (
  id          TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id                    TEXT PRIMARY KEY,
  "accountId"           TEXT NOT NULL,
  "providerId"          TEXT NOT NULL,
  "userId"              TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"         TEXT,
  "refreshToken"        TEXT,
  "idToken"             TEXT,
  "accessTokenExpiresAt" TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope                 TEXT,
  password              TEXT,
  "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updatedAt"           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS verification (
  id         TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,
  value      TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT now(),
  "updatedAt" TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- DAILY CHALLENGE
-- A single shared list of exercises with daily targets, editable
-- by any signed-in user. Everyone works toward the same goal.
-- ============================================================

CREATE TABLE daily_exercises (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  target      INT  NOT NULL CHECK (target > 0),   -- daily target count
  unit        TEXT NOT NULL DEFAULT 'reps',
  sort_order  INT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- One accumulating row per user / day / exercise.
-- Logging reps upserts and increments `count`.
CREATE TABLE daily_progress (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES daily_exercises(id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count       INT  NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, logged_date, exercise_id)
);

CREATE INDEX daily_progress_date_idx ON daily_progress(logged_date);
