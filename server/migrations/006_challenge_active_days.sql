-- ============================================================
-- CHALLENGE SCHEDULING
-- Each challenge exercise can run only on selected weekdays (e.g.
-- weekdays only). Integers follow JS getUTCDay(): 0 = Sunday … 6 =
-- Saturday. Default = every day, preserving existing behaviour.
-- Off-days don't count toward, and don't break, per-exercise streaks.
-- ============================================================

ALTER TABLE daily_exercises
  ADD COLUMN active_days INT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}';
