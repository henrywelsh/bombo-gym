-- ============================================================
-- Seed: shared daily challenge
-- ============================================================

INSERT INTO daily_exercises (name, target, unit, sort_order) VALUES
  ('Pullups',  30,  'reps', 1),
  ('Pushups', 100,  'reps', 2)
ON CONFLICT (name) DO NOTHING;
