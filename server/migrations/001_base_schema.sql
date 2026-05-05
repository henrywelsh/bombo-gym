-- ============================================================
-- better-auth tables
-- Pre-created here so profiles can reference "user"(id).
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
-- SHARED LOOKUP TABLES
-- ============================================================

CREATE TABLE exercises (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL UNIQUE,
  category        TEXT NOT NULL CHECK (category IN ('kettlebell', 'bodyweight')),
  is_daily_staple BOOLEAN NOT NULL DEFAULT false,
  notes           TEXT
);

CREATE TABLE weekly_split_days (
  day_of_week INT PRIMARY KEY CHECK (day_of_week BETWEEN 1 AND 5),
  label       TEXT NOT NULL
);

CREATE TABLE weekly_split_exercises (
  day_of_week INT  NOT NULL REFERENCES weekly_split_days(day_of_week) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order  INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (day_of_week, exercise_id)
);

CREATE TABLE mobility_routines (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase       TEXT NOT NULL CHECK (phase IN ('pre_strength', 'post_strength', 'morning', 'evening')),
  sort_order  INT  NOT NULL DEFAULT 0,
  description TEXT NOT NULL
);

-- ============================================================
-- USER TABLES
-- ============================================================

CREATE TABLE profiles (
  user_id            TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  program_start_date DATE,
  height_inches      NUMERIC,
  current_weight_lbs NUMERIC,
  target_weight_lbs  NUMERIC DEFAULT 200,
  created_at         TIMESTAMPTZ DEFAULT now()
);

-- NULL user_id = PDF default template; per-user rows are user-editable copies
CREATE TABLE exercise_milestones (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT REFERENCES profiles(user_id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  month       INT  NOT NULL CHECK (month IN (0, 3, 6, 9, 12)),
  weight_lbs  NUMERIC,
  sets        INT  NOT NULL DEFAULT 0,
  reps        INT  NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX exercise_milestones_default_unique
  ON exercise_milestones(exercise_id, month)
  WHERE user_id IS NULL;

CREATE UNIQUE INDEX exercise_milestones_user_unique
  ON exercise_milestones(user_id, exercise_id, month)
  WHERE user_id IS NOT NULL;

CREATE TABLE exercise_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  logged_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sets        INT  NOT NULL,
  reps        INT  NOT NULL,
  weight_lbs  NUMERIC,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, logged_date, exercise_id)
);

CREATE TABLE body_measurements (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           TEXT    NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  logged_date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs        NUMERIC,
  muscle_percentage NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, logged_date)
);

CREATE TABLE user_supplements (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  dose       TEXT,
  frequency  TEXT,
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supplement_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  supplement_id UUID NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  logged_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  completed     BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (supplement_id, logged_date)
);

CREATE TABLE meal_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  meal_slot   TEXT CHECK (meal_slot IN ('breakfast','lunch','snack','dinner','post_workout')),
  calories    INT,
  protein_g   NUMERIC,
  carbs_g     NUMERIC,
  fat_g       NUMERIC,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE meal_plans (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  week_start       DATE NOT NULL,
  day_of_week      INT  NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_slot        TEXT NOT NULL CHECK (meal_slot IN ('breakfast','lunch','snack','dinner','post_workout')),
  description      TEXT,
  meal_template_id UUID REFERENCES meal_templates(id) ON DELETE SET NULL,
  calories         INT,
  protein_g        NUMERIC,
  carbs_g          NUMERIC,
  fat_g            NUMERIC,
  UNIQUE (user_id, week_start, day_of_week, meal_slot)
);
