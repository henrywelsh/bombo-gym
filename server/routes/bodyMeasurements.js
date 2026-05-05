import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/body-measurements', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM body_measurements WHERE user_id = $1 ORDER BY logged_date DESC`,
    [req.userId]
  )
  res.json(rows)
})

router.post('/body-measurements', async (req, res) => {
  const { date, weight_lbs, muscle_percentage } = req.body
  const { rows } = await pool.query(`
    INSERT INTO body_measurements (user_id, logged_date, weight_lbs, muscle_percentage)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (user_id, logged_date)
    DO UPDATE SET weight_lbs = $3, muscle_percentage = $4
    RETURNING *
  `, [req.userId, date, weight_lbs ?? null, muscle_percentage ?? null])
  res.json(rows[0])
})

export default router
