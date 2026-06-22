import { Router } from 'express'
import { pool } from '../db.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

// Public check-in data: the benchmark exercise list, every user who has results,
// and all results (for the progression charts).
router.get('/benchmarks', async (_req, res) => {
  const { rows: exercises } = await pool.query(`
    SELECT be.exercise_id, e.name, e.metric, be.sort_order
    FROM benchmark_exercises be
    JOIN exercises e ON e.id = be.exercise_id
    ORDER BY be.sort_order, e.name
  `)
  const { rows: results } = await pool.query(`
    SELECT user_id, exercise_id, to_char(month, 'YYYY-MM') AS month, value
    FROM benchmark_results
    ORDER BY month
  `)
  const { rows: users } = await pool.query(`
    SELECT u.id AS user_id, u.name, u.image
    FROM "user" u
    WHERE EXISTS (SELECT 1 FROM benchmark_results r WHERE r.user_id = u.id)
    ORDER BY u.name
  `)
  res.json({ exercises, users, results })
})

// Record / update my measurement for an exercise in a month (upsert).
router.post('/benchmarks/results', async (req, res) => {
  const { exercise_id, month, value } = req.body
  if (!exercise_id || !month || value === '' || value == null || isNaN(Number(value))) {
    return res.status(400).json({ error: 'exercise_id, month, and a numeric value are required' })
  }
  const { rows } = await pool.query(`
    INSERT INTO benchmark_results (user_id, exercise_id, month, value)
    VALUES ($1, $2, date_trunc('month', $3::date)::date, $4)
    ON CONFLICT (user_id, exercise_id, month)
    DO UPDATE SET value = EXCLUDED.value, recorded_at = now()
    RETURNING id, exercise_id, to_char(month, 'YYYY-MM') AS month, value
  `, [req.userId, exercise_id, month, Number(value)])
  res.json(rows[0])
})

// Owner-only: manage which catalog exercises are benchmarks.
router.post('/benchmarks', requireAdmin, async (req, res) => {
  const { exercise_id, sort_order } = req.body
  if (!exercise_id) return res.status(400).json({ error: 'exercise_id is required' })
  const { rows } = await pool.query(`
    INSERT INTO benchmark_exercises (exercise_id, sort_order)
    VALUES ($1, COALESCE($2, 0))
    ON CONFLICT (exercise_id) DO NOTHING
    RETURNING exercise_id
  `, [exercise_id, sort_order ?? null])
  if (!rows.length) return res.status(409).json({ error: 'Already a benchmark' })
  res.json(rows[0])
})

router.delete('/benchmarks/:exerciseId', requireAdmin, async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM benchmark_exercises WHERE exercise_id = $1`, [req.params.exerciseId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

export default router
