import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

router.get('/milestones', async (req, res) => {
  const { userId } = req

  const { rows: existing } = await pool.query(`
    SELECT em.*, row_to_json(e.*) AS exercises
    FROM exercise_milestones em
    JOIN exercises e ON e.id = em.exercise_id
    WHERE em.user_id = $1
  `, [userId])

  if (existing.length > 0) return res.json(existing)

  // First login: copy defaults (user_id IS NULL) into user rows
  await pool.query(`
    INSERT INTO exercise_milestones (user_id, exercise_id, month, weight_lbs, sets, reps)
    SELECT $1, exercise_id, month, weight_lbs, sets, reps
    FROM exercise_milestones
    WHERE user_id IS NULL
  `, [userId])

  const { rows: seeded } = await pool.query(`
    SELECT em.*, row_to_json(e.*) AS exercises
    FROM exercise_milestones em
    JOIN exercises e ON e.id = em.exercise_id
    WHERE em.user_id = $1
  `, [userId])
  res.json(seeded)
})

router.put('/milestones/:id', async (req, res) => {
  const { weight_lbs, sets, reps } = req.body
  const { rows } = await pool.query(`
    UPDATE exercise_milestones
    SET weight_lbs = $1, sets = $2, reps = $3
    WHERE id = $4 AND user_id = $5
    RETURNING *
  `, [weight_lbs, sets, reps, req.params.id, req.userId])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  res.json(rows[0])
})

export default router
