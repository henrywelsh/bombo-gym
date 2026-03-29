-- ============================================================
-- Bombo Gym Schema
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- SHARED LOOKUP TABLES (seeded from PDF, no user_id, public read)
-- ============================================================

CREATE TABLE exercises (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL UNIQUE,
  category       TEXT NOT NULL CHECK (category IN ('kettlebell', 'bodyweight')),
  is_daily_staple BOOLEAN NOT NULL DEFAULT false,
  notes          TEXT
);

CREATE TABLE weekly_split_days (
  day_of_week  INT PRIMARY KEY CHECK (day_of_week BETWEEN 1 AND 5),
  label        TEXT NOT NULL
);

CREATE TABLE weekly_split_exercises (
  day_of_week  INT NOT NULL REFERENCES weekly_split_days(day_of_week) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order   INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day_of_week, exercise_id)
);

CREATE TABLE mobility_routines (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  phase       TEXT NOT NULL CHECK (phase IN ('pre_strength', 'post_strength', 'morning', 'evening')),
  sort_order  INT NOT NULL DEFAULT 0,
  description TEXT NOT NULL
);

-- ============================================================
-- USER TABLES
-- ============================================================

CREATE TABLE profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  program_start_date  DATE,
  height_inches       NUMERIC,
  current_weight_lbs  NUMERIC,
  target_weight_lbs   NUMERIC DEFAULT 200,
  created_at          TIMESTAMPTZ DEFAULT now()
);

-- exercise_milestones: NULL user_id = PDF default template
-- Per-user rows are copies of defaults, user-editable
CREATE TABLE exercise_milestones (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  month        INT NOT NULL CHECK (month IN (0, 3, 6, 9, 12)),
  weight_lbs   NUMERIC,
  sets         INT NOT NULL DEFAULT 0,
  reps         INT NOT NULL DEFAULT 0
);

-- Only one default row per (exercise, month)
CREATE UNIQUE INDEX exercise_milestones_default_unique
  ON exercise_milestones(exercise_id, month)
  WHERE user_id IS NULL;

-- Only one user row per (user, exercise, month)
CREATE UNIQUE INDEX exercise_milestones_user_unique
  ON exercise_milestones(user_id, exercise_id, month)
  WHERE user_id IS NOT NULL;

CREATE TABLE exercise_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  exercise_id  UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
  sets         INT NOT NULL,
  reps         INT NOT NULL,
  weight_lbs   NUMERIC,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE body_measurements (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  logged_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_lbs        NUMERIC NOT NULL,
  muscle_percentage NUMERIC,
  created_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, logged_date)
);

CREATE TABLE user_supplements (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  dose       TEXT,
  frequency  TEXT,
  notes      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE supplement_logs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplement_id  UUID NOT NULL REFERENCES user_supplements(id) ON DELETE CASCADE,
  logged_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  completed      BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (supplement_id, logged_date)
);

CREATE TABLE meal_templates (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
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
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start        DATE NOT NULL,
  day_of_week       INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  meal_slot         TEXT NOT NULL CHECK (meal_slot IN ('breakfast','lunch','snack','dinner','post_workout')),
  description       TEXT,
  meal_template_id  UUID REFERENCES meal_templates(id) ON DELETE SET NULL,
  calories          INT,
  protein_g         NUMERIC,
  carbs_g           NUMERIC,
  fat_g             NUMERIC,
  UNIQUE (user_id, week_start, day_of_week, meal_slot)
);

-- ============================================================
-- TRIGGER: auto-create profile row on Google sign-up
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE body_measurements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_supplements    ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplement_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_templates      ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans          ENABLE ROW LEVEL SECURITY;

-- Lookup tables: public read, no write from client
ALTER TABLE exercises             ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_split_days     ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_split_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobility_routines     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read" ON exercises             FOR SELECT USING (true);
CREATE POLICY "public read" ON weekly_split_days     FOR SELECT USING (true);
CREATE POLICY "public read" ON weekly_split_exercises FOR SELECT USING (true);
CREATE POLICY "public read" ON mobility_routines     FOR SELECT USING (true);

-- profiles
CREATE POLICY "own profile" ON profiles
  FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- exercise_milestones: read own + defaults; write own only
CREATE POLICY "read milestones" ON exercise_milestones
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "modify milestones" ON exercise_milestones
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- exercise_logs
CREATE POLICY "own exercise_logs" ON exercise_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- body_measurements
CREATE POLICY "own body_measurements" ON body_measurements
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- user_supplements
CREATE POLICY "own supplements" ON user_supplements
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- supplement_logs
CREATE POLICY "own supplement_logs" ON supplement_logs
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- meal_templates
CREATE POLICY "own meal_templates" ON meal_templates
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- meal_plans
CREATE POLICY "own meal_plans" ON meal_plans
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
