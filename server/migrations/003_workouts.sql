-- ============================================================
-- WORKOUT TRACKER (private per-user log)
-- A workout is an ordered list of groups; each group is a single
-- exercise, a superset, or a circuit run for N rounds.
-- ============================================================

-- Shared, extensible exercise catalog (created_by NULL = seeded).
CREATE TABLE exercises (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  created_by  TEXT REFERENCES "user"(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE workouts (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  name         TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX workouts_user_date_idx ON workouts(user_id, performed_on DESC);

CREATE TABLE workout_groups (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id  UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL DEFAULT 'single' CHECK (kind IN ('single','superset','circuit')),
  rounds      INT  NOT NULL DEFAULT 1 CHECK (rounds > 0),
  sort_order  INT  NOT NULL DEFAULT 0
);

CREATE TABLE workout_group_exercises (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id    UUID NOT NULL REFERENCES workout_groups(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sets        INT,
  reps        INT,
  weight_lbs  NUMERIC,
  notes       TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

-- Seed a starter catalog of common movements.
INSERT INTO exercises (name) VALUES
  ('Back Squat'), ('Front Squat'), ('Deadlift'), ('Romanian Deadlift'),
  ('Bench Press'), ('Incline Bench Press'), ('Overhead Press'),
  ('Barbell Row'), ('Pull-up'), ('Chin-up'), ('Push-up'), ('Dip'),
  ('Lunge'), ('Bulgarian Split Squat'), ('Hip Thrust'),
  ('Bicep Curl'), ('Tricep Extension'), ('Lateral Raise'),
  ('Plank'), ('Hanging Leg Raise'), ('Kettlebell Swing'), ('Goblet Squat')
ON CONFLICT (name) DO NOTHING;
