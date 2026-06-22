import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

// Public daily board: everyone's progress for a day, plus current streaks.
router.get('/board', async (req, res) => {
  const date = req.query.date || isoDate(new Date())

  // Shared challenge definition.
  const { rows: exercises } = await pool.query(
    `SELECT id, name, target, unit FROM daily_exercises ORDER BY sort_order, name`
  )
  const totalEx = exercises.length

  // Everyone's counts for the selected day.
  const { rows: progress } = await pool.query(`
    SELECT u.id AS user_id, u.name, u.image, dp.exercise_id, dp.count
    FROM daily_progress dp
    JOIN "user" u ON u.id = dp.user_id
    WHERE dp.logged_date = $1
    ORDER BY u.name
  `, [date])

  // Completed days per user across all history, for streak computation.
  // A day is "complete" when the user met the target for every active exercise.
  const { rows: completedRows } = await pool.query(`
    SELECT dp.user_id, dp.logged_date
    FROM daily_progress dp
    JOIN daily_exercises de ON de.id = dp.exercise_id
    GROUP BY dp.user_id, dp.logged_date
    HAVING COUNT(*) FILTER (WHERE dp.count >= de.target) >= $1 AND $1 > 0
  `, [totalEx])

  const completedByUser = {}
  for (const r of completedRows) {
    const day = isoDate(new Date(r.logged_date))
    ;(completedByUser[r.user_id] ||= new Set()).add(day)
  }

  function streakFor(userId) {
    const days = completedByUser[userId]
    if (!days) return 0
    const cursor = new Date()
    // If today isn't complete yet, start counting from yesterday.
    if (!days.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1)
    let streak = 0
    while (days.has(isoDate(cursor))) {
      streak++
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
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
    completed: totalEx > 0 && exercises.every(e => (u.counts[e.id] ?? 0) >= e.target),
    streak: streakFor(u.user_id),
  }))

  res.json({ date, exercises, users })
})

export default router
