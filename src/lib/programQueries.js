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

export async function addExercise(name) {
  return api.post('/api/exercises', { name })
}

export async function getWorkouts() {
  return api.get('/api/workouts')
}

export async function createWorkout(workout) {
  return api.post('/api/workouts', workout)
}

export async function deleteWorkout(id) {
  return api.delete(`/api/workouts/${id}`)
}
