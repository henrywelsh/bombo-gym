/**
 * Returns how many months into the program the user is (0–12, clamped).
 * Uses calendar months (not 30-day approximation).
 */
export function currentProgramMonth(startDateStr) {
  if (!startDateStr) return 0
  const start = new Date(startDateStr)
  const now = new Date()
  if (now < start) return 0
  const years = now.getFullYear() - start.getFullYear()
  const months = now.getMonth() - start.getMonth()
  return Math.min(12, Math.max(0, years * 12 + months))
}

/**
 * Returns { current, next } milestone objects for a given month.
 * `current` = the milestone at or before currentMonth (what you should be doing now)
 * `next`    = the upcoming milestone to aim for (or null if at month 12)
 *
 * milestones: array of { month, weight_lbs, sets, reps }
 */
export function getMilestoneTargets(milestones, currentMonth) {
  if (!milestones || milestones.length === 0) return { current: null, next: null }
  const sorted = [...milestones].sort((a, b) => a.month - b.month)
  const current = sorted.filter(m => m.month <= currentMonth).pop() || sorted[0]
  const next = sorted.find(m => m.month > currentMonth) || null
  return { current, next }
}

/**
 * Formats a milestone as a human-readable target string.
 * e.g. "70 lb × 8 sets × 12 reps"
 */
export function formatTarget(milestone) {
  if (!milestone) return '—'
  const parts = []
  if (milestone.weight_lbs) parts.push(`${milestone.weight_lbs} lb`)
  if (milestone.sets && milestone.reps) parts.push(`${milestone.sets}×${milestone.reps}`)
  else if (milestone.reps) parts.push(`${milestone.reps} reps`)
  return parts.join(' · ') || '—'
}

/**
 * Computes BMI from height (inches) and weight (lbs).
 */
export function computeBMI(heightInches, weightLbs) {
  if (!heightInches || !weightLbs) return null
  return ((weightLbs / (heightInches * heightInches)) * 703).toFixed(1)
}

/**
 * Returns the Monday of the week containing the given date.
 */
export function getWeekStart(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Formats a Date as YYYY-MM-DD (local time).
 */
export function toDateStr(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * Returns JS day of week (1=Mon … 5=Fri) for today, or null for weekend.
 */
export function todayDayOfWeek() {
  const day = new Date().getDay() // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return null
  return day
}
