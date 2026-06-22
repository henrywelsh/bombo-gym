import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// Shared, extensible exercise catalog for the workout tracker.

router.get('/exercises', async (_req, res) => {
  const { rows } = await pool.query(`SELECT id, name FROM exercises ORDER BY name`)
  res.json(rows)
})

router.post('/exercises', async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' })
  // Upsert so callers always get the row back, whether new or pre-existing.
  const { rows } = await pool.query(`
    INSERT INTO exercises (name, created_by)
    VALUES ($1, $2)
    ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name
  `, [name.trim(), req.userId])
  res.json(rows[0])
})

export default router
