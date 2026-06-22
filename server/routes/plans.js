import { Router } from 'express'
import { pool } from '../db.js'

const router = Router()

// My reusable workout plans, with nested groups + exercises (incl. each
// exercise's name and metric so the client can render the right fields).
router.get('/plans', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT p.id, p.name, p.notes,
      COALESCE(json_agg(
        json_build_object('id', g.id, 'kind', g.kind, 'rounds', g.rounds, 'exercises', g.exercises)
        ORDER BY g.sort_order
      ) FILTER (WHERE g.id IS NOT NULL), '[]') AS groups
    FROM workout_plans p
    LEFT JOIN (
      SELECT pg.id, pg.plan_id, pg.kind, pg.rounds, pg.sort_order,
        COALESCE(json_agg(
          json_build_object(
            'id', pe.id, 'exercise_id', pe.exercise_id, 'name', e.name, 'metric', e.metric,
            'target_reps', pe.target_reps, 'target_weight_lbs', pe.target_weight_lbs,
            'target_duration_sec', pe.target_duration_sec
          ) ORDER BY pe.sort_order
        ) FILTER (WHERE pe.id IS NOT NULL), '[]') AS exercises
      FROM workout_plan_groups pg
      LEFT JOIN workout_plan_exercises pe ON pe.group_id = pg.id
      LEFT JOIN exercises e ON e.id = pe.exercise_id
      GROUP BY pg.id
    ) g ON g.plan_id = p.id
    WHERE p.user_id = $1
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `, [req.userId])
  res.json(rows)
})

router.post('/plans', async (req, res) => {
  const { name, notes, groups } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'A plan needs a name' })
  if (!Array.isArray(groups) || groups.length === 0) {
    return res.status(400).json({ error: 'A plan needs at least one group' })
  }
  for (const g of groups) {
    if (!Array.isArray(g.exercises) || g.exercises.length === 0) {
      return res.status(400).json({ error: 'Each group needs at least one exercise' })
    }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { rows: [plan] } = await client.query(
      `INSERT INTO workout_plans (user_id, name, notes) VALUES ($1, $2, $3) RETURNING id`,
      [req.userId, name.trim(), notes?.trim() || null]
    )

    for (const [gi, g] of groups.entries()) {
      const kind = ['single', 'superset', 'circuit'].includes(g.kind) ? g.kind : 'single'
      const rounds = Number.isInteger(g.rounds) && g.rounds > 0 ? g.rounds : 1
      const { rows: [grp] } = await client.query(
        `INSERT INTO workout_plan_groups (plan_id, kind, rounds, sort_order)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [plan.id, kind, rounds, gi]
      )
      for (const [ei, ex] of g.exercises.entries()) {
        if (!ex.exercise_id) throw Object.assign(new Error('exercise_id is required'), { status: 400 })
        await client.query(
          `INSERT INTO workout_plan_exercises
             (group_id, exercise_id, target_reps, target_weight_lbs, target_duration_sec, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [grp.id, ex.exercise_id, ex.target_reps ?? null, ex.target_weight_lbs ?? null,
           ex.target_duration_sec ?? null, ei]
        )
      }
    }

    await client.query('COMMIT')
    res.json({ id: plan.id })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(err.status || 500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.delete('/plans/:id', async (req, res) => {
  const { rowCount } = await pool.query(
    `DELETE FROM workout_plans WHERE id = $1 AND user_id = $2`, [req.params.id, req.userId]
  )
  if (!rowCount) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

export default router
