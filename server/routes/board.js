import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Consecutive days (ending today, or yesterday if today isn't done yet) present in `days`.
function streakFromDays(days) {
  if (!days || days.size === 0) return 0
  const cursor = new Date()
  if (!days.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1)
  let streak = 0
  while (days.has(isoDate(cursor))) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// Whole-day count from a join date to today, inclusive (minimum 1).
function daysSinceJoin(createdAt) {
  const join  = new Date(isoDate(new Date(createdAt)))
  const today = new Date(isoDate(new Date()))
  return Math.max(1, Math.round((today - join) / 86400000) + 1)
}

// Leaderboard: per-day counts for the chart, plus per-exercise streaks and
// since-you-joined completion stats for every user who has ever participated.
router.get('/board', async (req, res) => {
  const date = req.query.date || isoDate(new Date())

  // Shared challenge definition.
  const { rows: exercises } = await pool.query(
    `SELECT id, name, target, unit FROM daily_exercises ORDER BY sort_order, name`
  )

  // Everyone who has ever logged progress (with join date for completion %).
  const { rows: allUsers } = await pool.query(`
    SELECT u.id AS user_id, u.name, u.image, u."createdAt"
    FROM "user" u
    WHERE EXISTS (SELECT 1 FROM daily_progress dp WHERE dp.user_id = u.id)
    ORDER BY u.name
  `)

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

  // user -> exercise -> Set<date> a target was hit (drives streaks and completion %).
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
    const since = daysSinceJoin(u.createdAt)
    const streaks = {}
    const completion = {} // exercise_id -> { days, pct } since this user joined
    for (const ex of exercises) {
      streaks[ex.id] = streakFromDays(hitDays[u.user_id]?.[ex.id])
      const days = hitDays[u.user_id]?.[ex.id]?.size ?? 0
      completion[ex.id] = { days, pct: Math.min(100, Math.round((days / since) * 100)) }
    }
    return {
      user_id: u.user_id,
      name: u.name,
      image: u.image,
      counts: countsByUser[u.user_id] || {},
      streaks,
      completion,
      daysSinceJoin: since,
    }
  })

  res.json({ date, exercises, users })
})

export default router
