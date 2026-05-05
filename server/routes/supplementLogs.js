import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/supplement-logs', async (req, res) => {
  const { date } = req.query
  const { rows } = await pool.query(`
    SELECT sl.*, row_to_json(us.*) AS user_supplements
    FROM supplement_logs sl
    JOIN user_supplements us ON us.id = sl.supplement_id
    WHERE sl.user_id = $1 AND sl.logged_date = $2
  `, [req.userId, date])
  res.json(rows)
})

router.post('/supplement-logs', async (req, res) => {
  const { supplementId, date, completed } = req.body
  const { rows } = await pool.query(`
    INSERT INTO supplement_logs (user_id, supplement_id, logged_date, completed)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (supplement_id, logged_date)
    DO UPDATE SET completed = $4
    RETURNING *
  `, [req.userId, supplementId, date, completed])
  res.json(rows[0])
})

export default router
