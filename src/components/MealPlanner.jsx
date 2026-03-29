import { useState } from 'react'
import { upsertMealPlanEntry, deleteMealPlanEntry } from '../lib/programQueries'
import { useAuth } from '../App'

const MEAL_SLOTS = ['breakfast', 'lunch', 'snack', 'dinner', 'post_workout']
const SLOT_LABELS = {
  breakfast:   'Breakfast',
  lunch:       'Lunch',
  snack:       'Snack',
  dinner:      'Dinner',
  post_workout: 'Post-Workout',
}
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Sat', 'Sun']

/**
 * Props:
 *   weekStart    - date string "YYYY-MM-DD" (Monday)
 *   entries      - array of meal_plan rows for this week
 *   templates    - array of meal_template rows
 *   onUpdate     - callback() to refresh parent
 */
export default function MealPlanner({ weekStart, entries = [], templates = [], onUpdate }) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(null) // { dayOfWeek, mealSlot }
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  function getEntry(dayOfWeek, mealSlot) {
    return entries.find(e => e.day_of_week === dayOfWeek && e.meal_slot === mealSlot)
  }

  function openEdit(dayOfWeek, mealSlot) {
    const existing = getEntry(dayOfWeek, mealSlot)
    setForm(existing ? { ...existing } : {
      day_of_week: dayOfWeek,
      meal_slot:   mealSlot,
      week_start:  weekStart,
      description: '',
      calories:    '',
      protein_g:   '',
      carbs_g:     '',
      fat_g:       '',
      meal_template_id: '',
    })
    setEditing({ dayOfWeek, mealSlot })
  }

  function applyTemplate(templateId) {
    const t = templates.find(t => t.id === templateId)
    if (!t) return
    setForm(f => ({
      ...f,
      meal_template_id: templateId,
      description: t.description || '',
      calories:    t.calories || '',
      protein_g:   t.protein_g || '',
      carbs_g:     t.carbs_g || '',
      fat_g:       t.fat_g || '',
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await upsertMealPlanEntry(user.id, {
        week_start:  weekStart,
        day_of_week: editing.dayOfWeek,
        meal_slot:   editing.mealSlot,
        description: form.description || null,
        meal_template_id: form.meal_template_id || null,
        calories:    form.calories ? Number(form.calories) : null,
        protein_g:   form.protein_g ? Number(form.protein_g) : null,
        carbs_g:     form.carbs_g ? Number(form.carbs_g) : null,
        fat_g:       form.fat_g ? Number(form.fat_g) : null,
      })
      onUpdate()
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function clear() {
    setSaving(true)
    try {
      await deleteMealPlanEntry(user.id, weekStart, editing.dayOfWeek, editing.mealSlot)
      onUpdate()
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  // Daily macro totals
  function dayTotals(dayOfWeek) {
    const dayEntries = entries.filter(e => e.day_of_week === dayOfWeek)
    return {
      calories: dayEntries.reduce((s, e) => s + (e.calories || 0), 0),
      protein:  dayEntries.reduce((s, e) => s + (e.protein_g || 0), 0),
    }
  }

  return (
    <div>
      {/* Scrollable grid */}
      <div className="overflow-x-auto -mx-4 px-4">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="text-left text-slate-400 font-medium pb-2 pr-2 w-28">Meal</th>
              {[0,1,2,3,4,5,6].map(d => {
                const totals = dayTotals(d)
                return (
                  <th key={d} className="text-center pb-2 px-1 w-[calc(100%/7)]">
                    <div className="text-slate-300 font-medium">{DAY_LABELS[d] ?? ['Thu','Fri','Sat','Sun'][d-3]}</div>
                    {totals.calories > 0 && (
                      <div className="text-xs text-slate-500">{totals.calories} kcal</div>
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {MEAL_SLOTS.map(slot => (
              <tr key={slot} className="border-t border-slate-800">
                <td className="py-1.5 pr-2 text-slate-400 font-medium align-top pt-2">
                  {SLOT_LABELS[slot]}
                </td>
                {[0,1,2,3,4,5,6].map(d => {
                  const entry = getEntry(d, slot)
                  return (
                    <td key={d} className="py-1 px-1 align-top">
                      <button
                        onClick={() => openEdit(d, slot)}
                        className={`w-full min-h-[48px] rounded-lg p-1.5 text-left text-xs transition-colors ${
                          entry
                            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                            : 'bg-slate-800/50 hover:bg-slate-700/50 text-slate-600 border border-dashed border-slate-700'
                        }`}
                      >
                        {entry ? entry.description || '—' : '+'}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-white">
              {DAY_LABELS[editing.dayOfWeek]} · {SLOT_LABELS[editing.mealSlot]}
            </h3>

            {templates.length > 0 && (
              <div>
                <label className="label">Use template</label>
                <select
                  className="input"
                  value={form.meal_template_id || ''}
                  onChange={e => applyTemplate(e.target.value)}
                >
                  <option value="">— pick a template —</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">Description</label>
              <textarea
                className="input resize-none"
                rows={2}
                value={form.description || ''}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="What are you eating?"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[['calories','Calories (kcal)'],['protein_g','Protein (g)'],['carbs_g','Carbs (g)'],['fat_g','Fat (g)']].map(([key, lbl]) => (
                <div key={key}>
                  <label className="label">{lbl}</label>
                  <input
                    type="number"
                    className="input"
                    value={form[key] || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={save} disabled={saving} className="btn-primary flex-1">Save</button>
              <button onClick={clear} disabled={saving} className="btn-secondary">Clear</button>
              <button onClick={() => setEditing(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
