import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/meal-templates', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM meal_templates WHERE user_id = $1 ORDER BY name`,
    [req.userId]
  )
  res.json(rows)
})

router.post('/meal-templates', async (req, res) => {
  const { name, description, meal_slot, calories, protein_g, carbs_g, fat_g } = req.body
  const { rows } = await pool.query(`
    INSERT INTO meal_templates (user_id, name, description, meal_slot, calories, protein_g, carbs_g, fat_g)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [req.userId, name, description ?? null, meal_slot ?? null, calories ?? null, protein_g ?? null, carbs_g ?? null, fat_g ?? null])
  res.json(rows[0])
})

router.put('/meal-templates/:id', async (req, res) => {
  const { name, description, meal_slot, calories, protein_g, carbs_g, fat_g } = req.body
  const { rows } = await pool.query(`
    UPDATE meal_templates
    SET name = $1, description = $2, meal_slot = $3, calories = $4,
        protein_g = $5, carbs_g = $6, fat_g = $7
    WHERE id = $8 AND user_id = $9
    RETURNING *
  `, [name, description ?? null, meal_slot ?? null, calories ?? null, protein_g ?? null, carbs_g ?? null, fat_g ?? null, req.params.id, req.userId])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

router.delete('/meal-templates/:id', async (req, res) => {
  await pool.query(
    `DELETE FROM meal_templates WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.userId]
  )
  res.status(204).end()
})

export default router
