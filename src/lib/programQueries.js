import { api } from './apiClient'

// ── Current user ────────────────────────────────────────────────────────────────

export async function getMe() {
  return api.get('/api/me')
}

// ── Daily challenge (shared; only the owner can edit) ────────────────────────────

export async function getDailyExercises() {
  return api.get('/api/daily-exercises')
}

export async function addDailyExercise({ name, target, unit }) {
  return api.post('/api/daily-exercises', { name, target, unit })
}

export async function updateDailyExercise(id, updates) {
  return api.put(`/api/daily-exercises/${id}`, updates)
}

export async function deleteDailyExercise(id) {
  return api.delete(`/api/daily-exercises/${id}`)
}

// ── My progress ─────────────────────────────────────────────────────────────────

export async function getTodayProgress(date) {
  const qs = date ? `?date=${date}` : ''
  return api.get(`/api/progress${qs}`)
}

export async function addReps(exerciseId, count, date) {
  return api.post('/api/progress', { exercise_id: exerciseId, count, date })
}

// ── Public board ──────────────────────────────────────────────────────────────

export async function getBoard(date) {
  const qs = date ? `?date=${date}` : ''
  return api.get(`/api/board${qs}`)
}

// ── Workout tracker (private) ───────────────────────────────────────────────────

export async function getExercises() {
  return api.get('/api/exercises')
}

export async function addExercise(name, metric) {
  return api.post('/api/exercises', { name, metric })
}

// Reusable plans (templates)
export async function getPlans() {
  return api.get('/api/plans')
}

export async function createPlan(plan) {
  return api.post('/api/plans', plan)
}

export async function deletePlan(id) {
  return api.delete(`/api/plans/${id}`)
}

// Recorded sessions (performed instances)
export async function getSessions() {
  return api.get('/api/sessions')
}

export async function createSession(session) {
  return api.post('/api/sessions', session)
}

export async function deleteSession(id) {
  return api.delete(`/api/sessions/${id}`)
}

// ── Monthly benchmarks / check-in (public) ──────────────────────────────────────

export async function getBenchmarks() {
  return api.get('/api/benchmarks')
}

export async function recordBenchmark(exerciseId, month, value) {
  return api.post('/api/benchmarks/results', { exercise_id: exerciseId, month, value })
}

export async function addBenchmarkExercise(exerciseId) {
  return api.post('/api/benchmarks', { exercise_id: exerciseId })
}

export async function removeBenchmarkExercise(exerciseId) {
  return api.delete(`/api/benchmarks/${exerciseId}`)
}
