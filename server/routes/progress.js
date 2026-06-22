import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// My progress for a given day (defaults to today).
router.get('/progress', async (req, res) => {
  const { userId } = req
  const date = req.query.date || new Date().toISOString().slice(0, 10)
  const { rows } = await pool.query(`
    SELECT exercise_id, count
    FROM daily_progress
    WHERE user_id = $1 AND logged_date = $2
  `, [userId, date])
  res.json(rows)
})

// Add reps toward an exercise. Upserts and increments today's row.
router.post('/progress', async (req, res) => {
  const { userId } = req
  const { exercise_id, count } = req.body
  const date = req.body.date || new Date().toISOString().slice(0, 10)

  if (!exercise_id || !Number.isInteger(count) || count === 0) {
    return res.status(400).json({ error: 'exercise_id and a non-zero integer count are required' })
  }

  const { rows } = await pool.query(`
    INSERT INTO daily_progress (user_id, exercise_id, logged_date, count)
    VALUES ($1, $2, $3, GREATEST($4, 0))
    ON CONFLICT (user_id, logged_date, exercise_id)
    DO UPDATE SET count = GREATEST(daily_progress.count + $4, 0), updated_at = now()
    RETURNING *
  `, [userId, exercise_id, date, count])
  res.json(rows[0])
})

export default router
