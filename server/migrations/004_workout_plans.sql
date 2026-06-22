-- ============================================================
-- WORKOUT TRACKER v2: reusable plans + recorded sessions
-- Replaces the flat workout tables from 003. A plan is a reusable
-- template; a session is one performed instance with per-round actuals.
-- ============================================================

-- Old flat structure (throwaway during early development) — drop it.
DROP TABLE IF EXISTS workout_group_exercises;
DROP TABLE IF EXISTS workout_groups;
DROP TABLE IF EXISTS workouts;

-- Every exercise tracks reps; `metric` picks the customizable secondary
-- measure: weight (lb), duration (seconds), or none (bodyweight, reps only).
ALTER TABLE exercises
  ADD COLUMN metric TEXT NOT NULL DEFAULT 'weight'
  CHECK (metric IN ('weight', 'duration', 'none'));

UPDATE exercises SET metric = 'none'
  WHERE name IN ('Pull-up', 'Chin-up', 'Push-up', 'Dip', 'Hanging Leg Raise');
UPDATE exercises SET metric = 'duration'
  WHERE name IN ('Plank');

-- ── Plans (reusable templates) ──────────────────────────────────────────────────

CREATE TABLE workout_plans (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX workout_plans_user_idx ON workout_plans(user_id);

CREATE TABLE workout_plan_groups (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id    UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL DEFAULT 'single' CHECK (kind IN ('single','superset','circuit')),
  rounds     INT  NOT NULL DEFAULT 1 CHECK (rounds > 0),  -- "sets" for a single exercise
  sort_order INT  NOT NULL DEFAULT 0
);

CREATE TABLE workout_plan_exercises (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id            UUID NOT NULL REFERENCES workout_plan_groups(id) ON DELETE CASCADE,
  exercise_id         UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  target_reps         INT,
  target_weight_lbs   NUMERIC,
  target_duration_sec INT,
  sort_order          INT NOT NULL DEFAULT 0
);

-- ── Sessions (performed instances) ──────────────────────────────────────────────
-- The recorded grid is stored as a self-contained JSONB snapshot so history
-- stays intact even if the plan or catalog later changes. `name` is snapshotted
-- for the same reason; `plan_id` is a soft reference.

CREATE TABLE workout_sessions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  plan_id      UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  performed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX workout_sessions_user_date_idx ON workout_sessions(user_id, performed_on DESC);
