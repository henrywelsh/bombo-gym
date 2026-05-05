import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/exercises/daily-staples', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM exercises WHERE is_daily_staple = true ORDER BY name`
  )
  res.json(rows)
})

router.get('/exercises', async (req, res) => {
  const { rows } = await pool.query(`SELECT * FROM exercises ORDER BY name`)
  res.json(rows)
})

router.get('/split/:dayOfWeek', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT wsd.day_of_week, wsd.label,
           json_agg(
             json_build_object('sort_order', wse.sort_order, 'exercises', row_to_json(e.*))
             ORDER BY wse.sort_order
           ) AS weekly_split_exercises
    FROM weekly_split_days wsd
    JOIN weekly_split_exercises wse ON wse.day_of_week = wsd.day_of_week
    JOIN exercises e ON e.id = wse.exercise_id
    WHERE wsd.day_of_week = $1
    GROUP BY wsd.day_of_week, wsd.label
  `, [req.params.dayOfWeek])

  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

router.get('/mobility-routines', async (req, res) => {
  const { phase } = req.query
  const { rows } = phase
    ? await pool.query(`SELECT * FROM mobility_routines WHERE phase = $1 ORDER BY sort_order`, [phase])
    : await pool.query(`SELECT * FROM mobility_routines ORDER BY sort_order`)
  res.json(rows)
})

export default router
