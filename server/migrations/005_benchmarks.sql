-- ============================================================
-- MONTHLY CHECK-IN / BENCHMARKS (public)
-- An owner-curated subset of the workout catalog is the benchmark set.
-- Each user records one value per benchmark exercise per month and the
-- public check-in page charts progression over time.
-- ============================================================

-- Which catalog exercises are benchmarks (owner-managed). Metric/name come
-- from the referenced exercises row.
CREATE TABLE benchmark_exercises (
  exercise_id UUID PRIMARY KEY REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- One measurement per user / exercise / month. `month` is the first of the month.
CREATE TABLE benchmark_results (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  month       DATE NOT NULL,
  value       NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, exercise_id, month)
);

CREATE INDEX benchmark_results_month_idx ON benchmark_results(month);

-- Seed a starter benchmark set from the catalog (max pull-ups, bench 1RM, plank hold).
INSERT INTO benchmark_exercises (exercise_id, sort_order)
SELECT id, sort_order FROM (
  SELECT id, 1 AS sort_order FROM exercises WHERE name = 'Pull-up'
  UNION ALL SELECT id, 2 FROM exercises WHERE name = 'Bench Press'
  UNION ALL SELECT id, 3 FROM exercises WHERE name = 'Plank'
) s
ON CONFLICT (exercise_id) DO NOTHING;
