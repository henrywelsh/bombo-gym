import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/meal-plans', async (req, res) => {
  const { weekStart } = req.query
  const { rows } = await pool.query(
    `SELECT * FROM meal_plans WHERE user_id = $1 AND week_start = $2 ORDER BY day_of_week, meal_slot`,
    [req.userId, weekStart]
  )
  res.json(rows)
})

router.post('/meal-plans', async (req, res) => {
  const { week_start, day_of_week, meal_slot, description, meal_template_id, calories, protein_g, carbs_g, fat_g } = req.body
  const { rows } = await pool.query(`
    INSERT INTO meal_plans (user_id, week_start, day_of_week, meal_slot, description, meal_template_id, calories, protein_g, carbs_g, fat_g)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    ON CONFLICT (user_id, week_start, day_of_week, meal_slot)
    DO UPDATE SET
      description       = $5,
      meal_template_id  = $6,
      calories          = $7,
      protein_g         = $8,
      carbs_g           = $9,
      fat_g             = $10
    RETURNING *
  `, [req.userId, week_start, day_of_week, meal_slot, description ?? null, meal_template_id ?? null,
      calories ?? null, protein_g ?? null, carbs_g ?? null, fat_g ?? null])
  res.json(rows[0])
})

router.delete('/meal-plans', async (req, res) => {
  const { weekStart, dayOfWeek, mealSlot } = req.query
  await pool.query(
    `DELETE FROM meal_plans WHERE user_id = $1 AND week_start = $2 AND day_of_week = $3 AND meal_slot = $4`,
    [req.userId, weekStart, dayOfWeek, mealSlot]
  )
  res.status(204).end()
})

export default router
