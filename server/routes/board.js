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

// Public daily board: everyone's progress for a day, plus per-exercise streaks.
router.get('/board', async (req, res) => {
  const date = req.query.date || isoDate(new Date())

  // Shared challenge definition.
  const { rows: exercises } = await pool.query(
    `SELECT id, name, target, unit FROM daily_exercises ORDER BY sort_order, name`
  )

  // Everyone's counts for the selected day.
  const { rows: progress } = await pool.query(`
    SELECT u.id AS user_id, u.name, u.image, dp.exercise_id, dp.count
    FROM daily_progress dp
    JOIN "user" u ON u.id = dp.user_id
    WHERE dp.logged_date = $1
    ORDER BY u.name
  `, [date])

  // All (user, exercise, day) rows that hit the exercise's target, for per-exercise streaks.
  const { rows: hitRows } = await pool.query(`
    SELECT dp.user_id, dp.exercise_id, dp.logged_date
    FROM daily_progress dp
    JOIN daily_exercises de ON de.id = dp.exercise_id
    WHERE dp.count >= de.target
  `)

  // user_id -> exercise_id -> Set<dateString>
  const hitDays = {}
  for (const r of hitRows) {
    const day = isoDate(new Date(r.logged_date))
    ;((hitDays[r.user_id] ||= {})[r.exercise_id] ||= new Set()).add(day)
  }

  function streaksFor(userId) {
    const out = {}
    const byEx = hitDays[userId] || {}
    for (const ex of exercises) out[ex.id] = streakFromDays(byEx[ex.id])
    return out
  }

  // Assemble one entry per user that participated on this day.
  const usersById = {}
  for (const row of progress) {
    const u = (usersById[row.user_id] ||= {
      user_id: row.user_id, name: row.name, image: row.image, counts: {},
    })
    u.counts[row.exercise_id] = row.count
  }

  const users = Object.values(usersById).map(u => ({
    ...u,
    streaks: streaksFor(u.user_id),
  }))

  res.json({ date, exercises, users })
})

export default router
