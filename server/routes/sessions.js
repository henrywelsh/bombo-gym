import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// My recorded workout sessions, newest first. `data` is the self-contained
// JSONB snapshot of the performed grid (groups → exercises → per-round sets).
router.get('/sessions', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT id, plan_id, name, performed_on, notes, data
    FROM workout_sessions
    WHERE user_id = $1
    ORDER BY performed_on DESC, created_at DESC
  `, [req.userId])
  res.json(rows)
})

router.post('/sessions', async (req, res) => {
  const { plan_id, name, performed_on, notes, data } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'A session needs a name' })
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'data is required' })

  const { rows } = await pool.query(`
    INSERT INTO workout_sessions (user_id, plan_id, name, performed_on, notes, data)
    VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)
    RETURNING id
  `, [req.userId, plan_id || null, name.trim(), performed_on || null, notes?.trim() || null, data])
  res.json(rows[0])
})

router.delete('/sessions/:id', async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM workout_sessions WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

export default router
