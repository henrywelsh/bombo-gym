import { api } from './apiClient'

// ── Lookup queries ────────────────────────────────────────────────────────────

export async function getDailyStaples() {
  return api.get('/api/exercises/daily-staples')
}

export async function getTodaysSplit(dayOfWeek) {
  return api.get(`/api/split/${dayOfWeek}`)
}

export async function getMobilityRoutines(phase) {
  const qs = phase ? `?phase=${phase}` : ''
  return api.get(`/api/mobility-routines${qs}`)
}

export async function getAllExercises() {
  return api.get('/api/exercises')
}

// ── Exercise milestones ───────────────────────────────────────────────────────

export async function getUserMilestones(_userId) {
  return api.get('/api/milestones')
}

export async function updateMilestone(id, updates) {
  return api.put(`/api/milestones/${id}`, updates)
}

// ── Exercise logs ─────────────────────────────────────────────────────────────

export async function logExercises(_userId, date, entries) {
  return api.post('/api/exercise-logs', { date, entries })
}

export async function getExerciseLogs(_userId, fromDate, toDate) {
  const params = new URLSearchParams()
  if (fromDate) params.set('from', fromDate)
  if (toDate)   params.set('to', toDate)
  const qs = params.size ? `?${params}` : ''
  return api.get(`/api/exercise-logs${qs}`)
}

export async function getLogsForDate(_userId, date) {
  return api.get(`/api/exercise-logs?date=${date}`)
}

// ── Body measurements ─────────────────────────────────────────────────────────

export async function upsertMeasurement(_userId, date, { weight_lbs, muscle_percentage }) {
  return api.post('/api/body-measurements', { date, weight_lbs, muscle_percentage })
}

export async function getBodyMeasurements(_userId) {
  return api.get('/api/body-measurements')
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(_userId) {
  return api.get('/api/profile')
}

export async function upsertProfile(_userId, updates) {
  return api.put('/api/profile', updates)
}

// ── Supplements ───────────────────────────────────────────────────────────────

export async function getSupplements(_userId) {
  return api.get('/api/supplements')
}

export async function upsertSupplement(_userId, supplement) {
  const { id, ...rest } = supplement
  if (id) return api.put(`/api/supplements/${id}`, rest)
  return api.post('/api/supplements', rest)
}

export async function deleteSupplement(id) {
  return api.delete(`/api/supplements/${id}`)
}

export async function getSupplementLogs(_userId, date) {
  return api.get(`/api/supplement-logs?date=${date}`)
}

export async function toggleSupplementLog(_userId, supplementId, date, completed) {
  return api.post('/api/supplement-logs', { supplementId, date, completed })
}

// ── Meal templates ────────────────────────────────────────────────────────────

export async function getMealTemplates(_userId) {
  return api.get('/api/meal-templates')
}

export async function upsertMealTemplate(_userId, template) {
  const { id, ...rest } = template
  if (id) return api.put(`/api/meal-templates/${id}`, rest)
  return api.post('/api/meal-templates', rest)
}

export async function deleteMealTemplate(id) {
  return api.delete(`/api/meal-templates/${id}`)
}

// ── Meal plans ────────────────────────────────────────────────────────────────

export async function getMealPlan(_userId, weekStart) {
  return api.get(`/api/meal-plans?weekStart=${weekStart}`)
}

export async function upsertMealPlanEntry(_userId, entry) {
  return api.post('/api/meal-plans', entry)
}

export async function deleteMealPlanEntry(_userId, weekStart, dayOfWeek, mealSlot) {
  return api.delete(`/api/meal-plans?weekStart=${weekStart}&dayOfWeek=${dayOfWeek}&mealSlot=${mealSlot}`)
}
