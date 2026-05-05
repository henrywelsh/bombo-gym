import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/profile', async (req, res) => {
  const { userId } = req
  await pool.query(
    `INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  )
  const { rows } = await pool.query(
    `SELECT * FROM profiles WHERE user_id = $1`, [userId]
  )
  res.json(rows[0] ?? null)
})

router.put('/profile', async (req, res) => {
  const { userId } = req
  const { program_start_date, height_inches, current_weight_lbs, target_weight_lbs } = req.body
  const { rows } = await pool.query(`
    INSERT INTO profiles (user_id, program_start_date, height_inches, current_weight_lbs, target_weight_lbs)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (user_id) DO UPDATE SET
      program_start_date  = EXCLUDED.program_start_date,
      height_inches       = EXCLUDED.height_inches,
      current_weight_lbs  = EXCLUDED.current_weight_lbs,
      target_weight_lbs   = EXCLUDED.target_weight_lbs
    RETURNING *
  `, [userId, program_start_date, height_inches, current_weight_lbs, target_weight_lbs])
  res.json(rows[0])
})

export default router
