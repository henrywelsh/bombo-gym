-- ============================================================
-- Seed: Lean Mass & Athletic Conditioning Program (PDF)
-- ============================================================

-- Exercises
INSERT INTO exercises (name, category, is_daily_staple, notes) VALUES
  ('Swings',               'kettlebell', true,  'Add 2–3 reps/week, ensure hip hinge safety'),
  ('Prying Goblet Squat',  'kettlebell', true,  'Include ankle mobility drills before heavy squats'),
  ('Halos',                'kettlebell', true,  'Slow, controlled rotations to protect labrum'),
  ('Pull-ups',             'bodyweight', false, 'Add bands or negatives first'),
  ('TGUs',                 'kettlebell', false, 'Strict form; focus on shoulder integrity'),
  ('Single-leg Deadlift',  'kettlebell', false, 'Focus on balance, ankle strengthening');

-- Exercise milestones (user_id = NULL = PDF defaults)
-- Months: 0 (current), 3, 6, 9, 12
WITH ex AS (SELECT id, name FROM exercises)
INSERT INTO exercise_milestones (exercise_id, month, weight_lbs, sets, reps)
SELECT id, 0,  53,  10, 10 FROM ex WHERE name = 'Swings'              UNION ALL
SELECT id, 3,  70,   8, 12 FROM ex WHERE name = 'Swings'              UNION ALL
SELECT id, 6,  80,  10,  8 FROM ex WHERE name = 'Swings'              UNION ALL
SELECT id, 9,  90,  10, 10 FROM ex WHERE name = 'Swings'              UNION ALL
SELECT id, 12, 108,  8,  6 FROM ex WHERE name = 'Swings'              UNION ALL

SELECT id, 0,  35,  3,  8  FROM ex WHERE name = 'Prying Goblet Squat' UNION ALL
SELECT id, 3,  53,  3, 10  FROM ex WHERE name = 'Prying Goblet Squat' UNION ALL
SELECT id, 6,  70,  3,  8  FROM ex WHERE name = 'Prying Goblet Squat' UNION ALL
SELECT id, 9,  80,  3, 10  FROM ex WHERE name = 'Prying Goblet Squat' UNION ALL
SELECT id, 12, 90,  3,  8  FROM ex WHERE name = 'Prying Goblet Squat' UNION ALL

SELECT id, 0,  35,  3, 10  FROM ex WHERE name = 'Halos'               UNION ALL
SELECT id, 3,  44,  3, 12  FROM ex WHERE name = 'Halos'               UNION ALL
SELECT id, 6,  53,  3, 12  FROM ex WHERE name = 'Halos'               UNION ALL
SELECT id, 9,  62,  3, 12  FROM ex WHERE name = 'Halos'               UNION ALL
SELECT id, 12, 70,  3, 12  FROM ex WHERE name = 'Halos'               UNION ALL

-- Pull-ups: weight_lbs NULL (bodyweight); month 0 = 0 reps (not yet)
SELECT id, 0,  NULL, 0,  0  FROM ex WHERE name = 'Pull-ups'           UNION ALL
SELECT id, 3,  NULL, 3,  5  FROM ex WHERE name = 'Pull-ups'           UNION ALL
SELECT id, 6,  NULL, 3,  8  FROM ex WHERE name = 'Pull-ups'           UNION ALL
SELECT id, 9,  NULL, 3, 10  FROM ex WHERE name = 'Pull-ups'           UNION ALL
SELECT id, 12, NULL, 3,  7  FROM ex WHERE name = 'Pull-ups'           UNION ALL

SELECT id, 0,  35,  3,  5  FROM ex WHERE name = 'TGUs'                UNION ALL
SELECT id, 3,  44,  3,  6  FROM ex WHERE name = 'TGUs'                UNION ALL
SELECT id, 6,  53,  3,  6  FROM ex WHERE name = 'TGUs'                UNION ALL
SELECT id, 9,  62,  3,  6  FROM ex WHERE name = 'TGUs'                UNION ALL
SELECT id, 12, 80,  3,  5  FROM ex WHERE name = 'TGUs'                UNION ALL

SELECT id, 0,  35,  3,  8  FROM ex WHERE name = 'Single-leg Deadlift' UNION ALL
SELECT id, 3,  44,  3, 10  FROM ex WHERE name = 'Single-leg Deadlift' UNION ALL
SELECT id, 6,  53,  3,  8  FROM ex WHERE name = 'Single-leg Deadlift' UNION ALL
SELECT id, 9,  70,  3,  8  FROM ex WHERE name = 'Single-leg Deadlift' UNION ALL
SELECT id, 12, 70,  3, 10  FROM ex WHERE name = 'Single-leg Deadlift';

-- Weekly strength split
INSERT INTO weekly_split_days (day_of_week, label) VALUES
  (1, 'Upper Pull + Core'),
  (2, 'Lower Body + Conditioning'),
  (3, 'Upper Push + Core'),
  (4, 'Lower Body + Conditioning'),
  (5, 'Full-body Power + Pull');

-- Split exercises
WITH ex AS (SELECT id, name FROM exercises)
INSERT INTO weekly_split_exercises (day_of_week, exercise_id, sort_order)
-- Mon: Upper Pull + Core
SELECT 1, id, 1 FROM ex WHERE name = 'Pull-ups'             UNION ALL
SELECT 1, id, 2 FROM ex WHERE name = 'Halos'                UNION ALL
SELECT 1, id, 3 FROM ex WHERE name = 'TGUs'                 UNION ALL
-- Tue: Lower Body + Conditioning
SELECT 2, id, 1 FROM ex WHERE name = 'Prying Goblet Squat'  UNION ALL
SELECT 2, id, 2 FROM ex WHERE name = 'Single-leg Deadlift'  UNION ALL
SELECT 2, id, 3 FROM ex WHERE name = 'Swings'               UNION ALL
-- Wed: Upper Push + Core
SELECT 3, id, 1 FROM ex WHERE name = 'Halos'                UNION ALL
SELECT 3, id, 2 FROM ex WHERE name = 'TGUs'                 UNION ALL
SELECT 3, id, 3 FROM ex WHERE name = 'Swings'               UNION ALL
-- Thu: Lower Body + Conditioning
SELECT 4, id, 1 FROM ex WHERE name = 'Prying Goblet Squat'  UNION ALL
SELECT 4, id, 2 FROM ex WHERE name = 'Single-leg Deadlift'  UNION ALL
SELECT 4, id, 3 FROM ex WHERE name = 'Swings'               UNION ALL
-- Fri: Full-body Power + Pull
SELECT 5, id, 1 FROM ex WHERE name = 'Swings'               UNION ALL
SELECT 5, id, 2 FROM ex WHERE name = 'Pull-ups'             UNION ALL
SELECT 5, id, 3 FROM ex WHERE name = 'TGUs'                 UNION ALL
SELECT 5, id, 4 FROM ex WHERE name = 'Single-leg Deadlift';

-- Mobility routines
INSERT INTO mobility_routines (phase, sort_order, description) VALUES
  -- Pre-strength (15 min)
  ('pre_strength', 1, 'Shoulder Dislocates: 2x10'),
  ('pre_strength', 2, 'Hip Circles: 2x10 each side'),
  ('pre_strength', 3, 'Cat/Cow: 1 min'),
  ('pre_strength', 4, 'Prying Goblet Squat Hold: 2x10 deep breath holds'),
  ('pre_strength', 5, 'Ankle Dorsiflexion Stretch: 2x30 sec each side'),
  -- Post-strength / pre-Peloton (15–20 min)
  ('post_strength', 1, 'Hamstring Stretch: 2x30 sec'),
  ('post_strength', 2, 'Pigeon Pose: 2x30 sec each side'),
  ('post_strength', 3, 'Thoracic Rotations: 2x10 each side'),
  ('post_strength', 4, 'Shoulder Halos w/light KB: 2x10'),
  ('post_strength', 5, 'Child''s Pose w/side stretch: 2x30 sec'),
  -- Daily morning (optional 10 min)
  ('morning', 1, 'Spinal Twists'),
  ('morning', 2, 'Cat/Cow'),
  ('morning', 3, 'Shoulder Band Stretch'),
  ('morning', 4, 'Hip Openers'),
  -- Evening wind-down (10–15 min)
  ('evening', 1, 'Deep Hamstring Stretch'),
  ('evening', 2, 'Adductor Stretch'),
  ('evening', 3, 'Supine Twists'),
  ('evening', 4, 'Pectoral Stretch');
