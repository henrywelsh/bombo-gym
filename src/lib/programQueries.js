import { supabase } from '../supabaseClient'

// ── Lookup queries (shared, no user_id) ──────────────────────────────────────

export async function getDailyStaples() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .eq('is_daily_staple', true)
    .order('name')
  if (error) throw error
  return data
}

export async function getTodaysSplit(dayOfWeek) {
  const { data, error } = await supabase
    .from('weekly_split_days')
    .select(`
      day_of_week,
      label,
      weekly_split_exercises (
        sort_order,
        exercises (*)
      )
    `)
    .eq('day_of_week', dayOfWeek)
    .single()
  if (error) throw error
  // Flatten and sort exercises by sort_order
  return {
    ...data,
    exercises: data.weekly_split_exercises
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(wse => wse.exercises),
  }
}

export async function getMobilityRoutines(phase) {
  const query = supabase
    .from('mobility_routines')
    .select('*')
    .order('sort_order')
  if (phase) query.eq('phase', phase)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAllExercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

// ── Exercise milestones ───────────────────────────────────────────────────────

/**
 * Returns the user's milestones. If none exist yet (first login),
 * copies the PDF defaults into user-specific rows first.
 */
export async function getUserMilestones(userId) {
  const { data: existing, error } = await supabase
    .from('exercise_milestones')
    .select('*, exercises(*)')
    .eq('user_id', userId)
  if (error) throw error

  if (existing.length > 0) return existing

  // First login: copy defaults
  const { data: defaults, error: defErr } = await supabase
    .from('exercise_milestones')
    .select('exercise_id, month, weight_lbs, sets, reps')
    .is('user_id', null)
  if (defErr) throw defErr

  const rows = defaults.map(d => ({ ...d, user_id: userId }))
  const { error: insErr } = await supabase.from('exercise_milestones').insert(rows)
  if (insErr) throw insErr

  // Re-fetch with exercise names
  const { data: seeded, error: refErr } = await supabase
    .from('exercise_milestones')
    .select('*, exercises(*)')
    .eq('user_id', userId)
  if (refErr) throw refErr
  return seeded
}

export async function updateMilestone(id, updates) {
  const { data, error } = await supabase
    .from('exercise_milestones')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Exercise logs ─────────────────────────────────────────────────────────────

export async function logExercises(userId, date, entries) {
  // entries: [{ exercise_id, sets, reps, weight_lbs, notes }]
  const rows = entries.map(e => ({ ...e, user_id: userId, logged_date: date }))
  const { data, error } = await supabase
    .from('exercise_logs')
    .upsert(rows, { onConflict: 'user_id,logged_date,exercise_id' })
    .select()
  if (error) throw error
  return data
}

export async function getExerciseLogs(userId, fromDate, toDate) {
  const query = supabase
    .from('exercise_logs')
    .select('*, exercises(*)')
    .eq('user_id', userId)
    .order('logged_date', { ascending: true })
  if (fromDate) query.gte('logged_date', fromDate)
  if (toDate)   query.lte('logged_date', toDate)
  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getLogsForDate(userId, date) {
  const { data, error } = await supabase
    .from('exercise_logs')
    .select('*, exercises(*)')
    .eq('user_id', userId)
    .eq('logged_date', date)
  if (error) throw error
  return data
}

// ── Body measurements ─────────────────────────────────────────────────────────

export async function upsertMeasurement(userId, date, { weight_lbs, muscle_percentage }) {
  const { data, error } = await supabase
    .from('body_measurements')
    .upsert({ user_id: userId, logged_date: date, weight_lbs, muscle_percentage },
             { onConflict: 'user_id,logged_date' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getBodyMeasurements(userId) {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('logged_date', { ascending: true })
  if (error) throw error
  return data
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function upsertProfile(userId, updates) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...updates })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Supplements ───────────────────────────────────────────────────────────────

export async function getSupplements(userId) {
  const { data, error } = await supabase
    .from('user_supplements')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('name')
  if (error) throw error
  return data
}

export async function upsertSupplement(userId, supplement) {
  const { id, ...rest } = supplement
  if (id) {
    const { data, error } = await supabase
      .from('user_supplements')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('user_supplements')
    .insert({ ...rest, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteSupplement(id) {
  const { error } = await supabase
    .from('user_supplements')
    .update({ active: false })
    .eq('id', id)
  if (error) throw error
}

export async function getSupplementLogs(userId, date) {
  const { data, error } = await supabase
    .from('supplement_logs')
    .select('*, user_supplements(*)')
    .eq('user_id', userId)
    .eq('logged_date', date)
  if (error) throw error
  return data
}

export async function toggleSupplementLog(userId, supplementId, date, completed) {
  const { data, error } = await supabase
    .from('supplement_logs')
    .upsert({ user_id: userId, supplement_id: supplementId, logged_date: date, completed },
             { onConflict: 'supplement_id,logged_date' })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Meal templates ────────────────────────────────────────────────────────────

export async function getMealTemplates(userId) {
  const { data, error } = await supabase
    .from('meal_templates')
    .select('*')
    .eq('user_id', userId)
    .order('name')
  if (error) throw error
  return data
}

export async function upsertMealTemplate(userId, template) {
  const { id, ...rest } = template
  if (id) {
    const { data, error } = await supabase
      .from('meal_templates')
      .update(rest)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
  const { data, error } = await supabase
    .from('meal_templates')
    .insert({ ...rest, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMealTemplate(id) {
  const { error } = await supabase.from('meal_templates').delete().eq('id', id)
  if (error) throw error
}

// ── Meal plans ────────────────────────────────────────────────────────────────

export async function getMealPlan(userId, weekStart) {
  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
  if (error) throw error
  return data
}

export async function upsertMealPlanEntry(userId, entry) {
  const { data, error } = await supabase
    .from('meal_plans')
    .upsert({ ...entry, user_id: userId },
             { onConflict: 'user_id,week_start,day_of_week,meal_slot' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMealPlanEntry(userId, weekStart, dayOfWeek, mealSlot) {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .eq('day_of_week', dayOfWeek)
    .eq('meal_slot', mealSlot)
  if (error) throw error
}
