import { Router } from 'express'
import { pool } from '../db.js'
import { requireAdmin } from '../middleware/requireAdmin.js'

const router = Router()

// Normalize a weekday array (0 = Sunday … 6 = Saturday): keep valid integers,
// dedupe, sort. Returns null for non-arrays so COALESCE leaves the column as-is.
function sanitizeDays(days) {
  if (!Array.isArray(days)) return null
  return [...new Set(days.map(Number).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
}

// The shared daily-challenge list. Any signed-in user can view it;
// only the owner (ADMIN_EMAIL) can add, edit, or remove exercises.

router.get('/daily-exercises', async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM daily_exercises ORDER BY sort_order, name`
  )
  res.json(rows)
})

router.post('/daily-exercises', requireAdmin, async (req, res) => {
  const { name, target, unit, sort_order, active_days } = req.body
  if (!name?.trim() || !(target > 0)) {
    return res.status(400).json({ error: 'name and a positive target are required' })
  }
  const { rows } = await pool.query(`
    INSERT INTO daily_exercises (name, target, unit, sort_order, active_days)
    VALUES ($1, $2, COALESCE($3, 'reps'), COALESCE($4, 0), COALESCE($5, '{0,1,2,3,4,5,6}'))
    ON CONFLICT (name) DO NOTHING
    RETURNING *
  `, [name.trim(), target, unit ?? null, sort_order ?? null, sanitizeDays(active_days)])
  if (!rows.length) return res.status(409).json({ error: 'Exercise already exists' })
  res.json(rows[0])
})

router.put('/daily-exercises/:id', requireAdmin, async (req, res) => {
  const { name, target, unit, sort_order, active_days } = req.body
  const { rows } = await pool.query(`
    UPDATE daily_exercises
    SET name        = COALESCE($1, name),
        target      = COALESCE($2, target),
        unit        = COALESCE($3, unit),
        sort_order  = COALESCE($4, sort_order),
        active_days = COALESCE($5, active_days)
    WHERE id = $6
    RETURNING *
  `, [name ?? null, target ?? null, unit ?? null, sort_order ?? null, sanitizeDays(active_days), req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

router.delete('/daily-exercises/:id', requireAdmin, async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM daily_exercises WHERE id = $1`, [req.params.id]
  )
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

export default router
