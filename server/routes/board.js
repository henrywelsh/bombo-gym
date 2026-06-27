import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Consecutive scheduled days (ending `today`, or the day before if today isn't
// done yet) present in `days`. `today` is the client's local date (YYYY-MM-DD)
// so the streak rolls over at the user's midnight, not the server's UTC midnight.
// `activeDays` are the weekdays the exercise is scheduled on (0 = Sunday … 6 =
// Saturday); off-days are skipped — they neither count toward nor break a streak.
function streakFromDays(days, today, activeDays) {
  if (!days || days.size === 0) return 0
  const active = new Set(activeDays)
  if (active.size === 0) return 0
  const cursor = new Date(today)   // parsed as UTC midnight; arithmetic stays in UTC
  // Today still in progress: if it's a scheduled day not yet hit, start from yesterday.
  if (active.has(cursor.getUTCDay()) && !days.has(isoDate(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  let streak = 0
  while (true) {
    if (!active.has(cursor.getUTCDay())) {   // off-day: skip without breaking the streak
      cursor.setUTCDate(cursor.getUTCDate() - 1)
      continue
    }
    if (!days.has(isoDate(cursor))) break    // scheduled day missed: streak ends
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }
  return streak
}

// Leaderboard: per-day counts for the chart, plus per-exercise streaks for
// every user who has ever participated.
router.get('/board', async (req, res) => {
  const date = req.query.date || isoDate(new Date())

  // Shared challenge definition.
  const { rows: exercises } = await pool.query(
    `SELECT id, name, target, unit, active_days FROM daily_exercises ORDER BY sort_order, name`
  )

  // Only users who logged reps on the selected day.
  const { rows: allUsers } = await pool.query(`
    SELECT u.id AS user_id, u.name, u.image
    FROM "user" u
    WHERE EXISTS (
      SELECT 1 FROM daily_progress dp
      WHERE dp.user_id = u.id AND dp.logged_date = $1 AND dp.count > 0
    )
    ORDER BY u.name
  `, [date])

  // Counts for the selected day (for the chart).
  const { rows: progress } = await pool.query(`
    SELECT user_id, exercise_id, count FROM daily_progress WHERE logged_date = $1
  `, [date])

  // All (user, exercise, day) rows that hit the exercise's target.
  const { rows: hitRows } = await pool.query(`
    SELECT dp.user_id, dp.exercise_id, dp.logged_date
    FROM daily_progress dp
    JOIN daily_exercises de ON de.id = dp.exercise_id
    WHERE dp.count >= de.target
  `)

  // user -> exercise -> Set<date> a target was hit (drives the per-exercise streaks).
  const hitDays = {}
  for (const r of hitRows) {
    const day = isoDate(new Date(r.logged_date))
    ;((hitDays[r.user_id] ||= {})[r.exercise_id] ||= new Set()).add(day)
  }

  // user -> exercise -> count for the selected day.
  const countsByUser = {}
  for (const r of progress) {
    (countsByUser[r.user_id] ||= {})[r.exercise_id] = r.count
  }

  const users = allUsers.map(u => {
    const streaks = {}
    for (const ex of exercises) {
      streaks[ex.id] = streakFromDays(hitDays[u.user_id]?.[ex.id], date, ex.active_days)
    }
    return {
      user_id: u.user_id,
      name: u.name,
      image: u.image,
      counts: countsByUser[u.user_id] || {},
      streaks,
    }
  })

  res.json({ date, exercises, users })
})

export default router
