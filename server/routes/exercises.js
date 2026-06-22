import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

const METRICS = ['weight', 'duration', 'none']

// Shared, extensible exercise catalog. `metric` is the secondary measure
// (reps are always tracked): weight, duration, or none (bodyweight).

router.get('/exercises', async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, name, metric FROM exercises ORDER BY name`)
  res.json(rows)
})

router.post('/exercises', async (req, res) => {
  const { name } = req.body
  const metric = METRICS.includes(req.body.metric) ? req.body.metric : 'weight'
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  const { rows } = await pool.query(`
    INSERT INTO exercises (name, metric, created_by)
    VALUES ($1, $2, $3)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, metric
  `, [name.trim(), metric, req.userId])
  res.json(rows[0])
})

export default router
