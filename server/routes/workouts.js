import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// My workout history, newest first, with nested groups + exercises.
router.get('/workouts', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT w.id, w.performed_on, w.name, w.notes,
      COALESCE(json_agg(
        json_build_object(
          'id', g.id, 'kind', g.kind, 'rounds', g.rounds, 'exercises', g.exercises
        ) ORDER BY g.sort_order
      ) FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
    FROM workouts w
    LEFT JOIN (
      SELECT wg.id, wg.workout_id, wg.kind, wg.rounds, wg.sort_order,
        COALESCE(json_agg(
          json_build_object(
            'id', wge.id, 'exercise_id', wge.exercise_id, 'name', e.name,
            'sets', wge.sets, 'reps', wge.reps, 'weight_lbs', wge.weight_lbs, 'notes', wge.notes
          ) ORDER BY wge.sort_order
        ) FILTER (WHERE wge.id IS NOT NULL), '[]') AS exercises
      FROM workout_groups wg
      LEFT JOIN workout_group_exercises wge ON wge.group_id = wg.id
      LEFT JOIN exercises e ON e.id = wge.exercise_id
      GROUP BY wg.id
    ) g ON g.workout_id = w.id
    WHERE w.user_id = $1
    GROUP BY w.id
    ORDER BY w.performed_on DESC, w.created_at DESC
  `, [req.userId])
  res.json(rows)
})

// Create a workout with its groups and exercises in one transaction.
router.post('/workouts', async (req, res) => {
  const { performed_on, name, notes, groups } = req.body
  if (!Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ error: 'A workout needs at least one group' })
  }
  for (const g of groups) {
    if (!Array.isArray(g.exercises) || g.exercises.length === 0) {
      return res.status(400).json({ error: 'Each group needs at least one exercise' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [workout] } = await client.query(`
      INSERT INTO workouts (user_id, performed_on, name, notes)
      VALUES ($1, COALESCE($2, CURRENT_DATE), $3, $4)
      RETURNING id
    `, [req.userId, performed_on || null, name?.trim() || null, notes?.trim() || null])

    for (const [gi, g] of groups.entries()) {
      const kind = ['single', 'superset', 'circuit'].includes(g.kind) ? g.kind : 'single'
      const rounds = Number.isInteger(g.rounds) && g.rounds > 0 ? g.rounds : 1
      const { rows: [grp] } = await client.query(`
        INSERT INTO workout_groups (workout_id, kind, rounds, sort_order)
        VALUES ($1, $2, $3, $4) RETURNING id
      `, [workout.id, kind, rounds, gi])

      for (const [ei, ex] of g.exercises.entries()) {
        if (!ex.exercise_id) throw Object.assign(new Error('exercise_id is required'), { status: 400 })
        await client.query(`
          INSERT INTO workout_group_exercises
            (group_id, exercise_id, sets, reps, weight_lbs, notes, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [grp.id, ex.exercise_id, ex.sets ?? null, ex.reps ?? null,
            ex.weight_lbs ?? null, ex.notes?.trim() || null, ei])
      }
    }

    await client.query('COMMIT')
    res.json({ id: workout.id })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.delete('/workouts/:id', async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM workouts WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

export default router
