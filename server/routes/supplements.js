import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/supplements', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM user_supplements WHERE user_id = $1 AND active = true ORDER BY name`,
    [req.userId]
  )
  res.json(rows)
})

router.post('/supplements', async (req, res) => {
  const { name, dose, frequency, notes } = req.body
  const { rows } = await pool.query(`
    INSERT INTO user_supplements (user_id, name, dose, frequency, notes)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [req.userId, name, dose ?? null, frequency ?? null, notes ?? null])
  res.json(rows[0])
})

router.put('/supplements/:id', async (req, res) => {
  const { name, dose, frequency, notes } = req.body
  const { rows } = await pool.query(`
    UPDATE user_supplements
    SET name = $1, dose = $2, frequency = $3, notes = $4
    WHERE id = $5 AND user_id = $6
    RETURNING *
  `, [name, dose ?? null, frequency ?? null, notes ?? null, req.params.id, req.userId])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

router.delete('/supplements/:id', async (req, res) => {
  await pool.query(
    `UPDATE user_supplements SET active = false WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.userId]
  )
  res.status(204).end()
})

export default router
