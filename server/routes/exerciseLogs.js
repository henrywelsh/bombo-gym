import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/exercise-logs', async (req, res) => {
  const { userId } = req
  const { date, from, to } = req.query

  if (date) {
    const { rows } = await pool.query(`
      SELECT el.*, row_to_json(e.*) AS exercises
      FROM exercise_logs el
      JOIN exercises e ON e.id = el.exercise_id
      WHERE el.user_id = $1 AND el.logged_date = $2
    `, [userId, date])
    return res.json(rows)
  }

  const params = [userId]
  let where = 'WHERE el.user_id = $1'
  if (from) { params.push(from); where += ` AND el.logged_date >= $${params.length}` }
  if (to)   { params.push(to);   where += ` AND el.logged_date <= $${params.length}` }

  const { rows } = await pool.query(`
    SELECT el.*, row_to_json(e.*) AS exercises
    FROM exercise_logs el
    JOIN exercises e ON e.id = el.exercise_id
    ${where}
    ORDER BY el.logged_date DESC
  `, params)
  res.json(rows)
})

router.post('/exercise-logs', async (req, res) => {
  const { userId } = req
  const { date, entries } = req.body
  const results = []

  for (const entry of entries) {
    const { rows } = await pool.query(`
      INSERT INTO exercise_logs (user_id, logged_date, exercise_id, sets, reps, weight_lbs, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, logged_date, exercise_id)
      DO UPDATE SET sets = $4, reps = $5, weight_lbs = $6, notes = $7
      RETURNING *
    `, [userId, date, entry.exercise_id, entry.sets, entry.reps, entry.weight_lbs ?? null, entry.notes ?? null])
    results.push(rows[0])
  }
  res.json(results)
})

export default router
