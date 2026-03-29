import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../App'
import {
  getMealPlan, getMealTemplates, upsertMealTemplate, deleteMealTemplate,
  upsertMeasurement, getBodyMeasurements, getSupplements,
  getSupplementLogs, toggleSupplementLog,
} from '../lib/programQueries'
import { getWeekStart, toDateStr, computeBMI } from '../lib/progressionUtils'
import MealPlanner from '../components/MealPlanner'

const WEEK_DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

export default function Nutrition() {
  const { user, profile } = useAuth()
  const [weekStart, setWeekStart]       = useState(toDateStr(getWeekStart()))
  const [mealPlan, setMealPlan]         = useState([])
  const [templates, setTemplates]       = useState([])
  const [measurements, setMeasurements] = useState([])
  const [supplements, setSupplements]   = useState([])
  const [suppLogs, setSuppLogs]         = useState([])
  const [loading, setLoading]           = useState(true)

  // New measurement form
  const [measForm, setMeasForm] = useState({ date: toDateStr(new Date()), weight_lbs: '', muscle_percentage: '' })
  const [measSaving, setMeasSaving] = useState(false)

  // Template form
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [templateForm, setTemplateForm] = useState({})

  const today = toDateStr(new Date())

  const loadWeekPlan = useCallback(async () => {
    if (!user) return
    const data = await getMealPlan(user.id, weekStart)
    setMealPlan(data)
  }, [user?.id, weekStart])

  useEffect(() => {
    if (!user) return
    async function load() {
      const [tmpl, meas, supps, sLogs] = await Promise.all([
        getMealTemplates(user.id),
        getBodyMeasurements(user.id),
        getSupplements(user.id),
        getSupplementLogs(user.id, today),
      ])
      setTemplates(tmpl)
      setMeasurements(meas)
      setSupplements(supps)
      setSuppLogs(sLogs)
      await loadWeekPlan()
      setLoading(false)
    }
    load()
  }, [user?.id])

  useEffect(() => { loadWeekPlan() }, [weekStart])

  async function saveMeasurement() {
    if (!measForm.weight_lbs) return
    setMeasSaving(true)
    try {
      await upsertMeasurement(user.id, measForm.date, {
        weight_lbs: Number(measForm.weight_lbs),
        muscle_percentage: measForm.muscle_percentage ? Number(measForm.muscle_percentage) : null,
      })
      const fresh = await getBodyMeasurements(user.id)
      setMeasurements(fresh)
      setMeasForm(f => ({ ...f, weight_lbs: '', muscle_percentage: '' }))
    } finally {
      setMeasSaving(false)
    }
  }

  async function toggleSupp(suppId, currentCompleted) {
    await toggleSupplementLog(user.id, suppId, today, !currentCompleted)
    const fresh = await getSupplementLogs(user.id, today)
    setSuppLogs(fresh)
  }

  async function saveTemplate() {
    await upsertMealTemplate(user.id, {
      ...templateForm,
      calories:  templateForm.calories ? Number(templateForm.calories) : null,
      protein_g: templateForm.protein_g ? Number(templateForm.protein_g) : null,
      carbs_g:   templateForm.carbs_g ? Number(templateForm.carbs_g) : null,
      fat_g:     templateForm.fat_g ? Number(templateForm.fat_g) : null,
    })
    const fresh = await getMealTemplates(user.id)
    setTemplates(fresh)
    setShowTemplateForm(false)
    setTemplateForm({})
  }

  async function removeTemplate(id) {
    await deleteMealTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  // Week navigation
  function changeWeek(delta) {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + delta * 7)
    setWeekStart(toDateStr(d))
  }

  // Daily macro totals for each day
  function dayMacros(dayIdx) {
    const day = mealPlan.filter(e => e.day_of_week === dayIdx)
    return {
      calories: day.reduce((s, e) => s + (e.calories || 0), 0),
      protein:  day.reduce((s, e) => s + (Number(e.protein_g) || 0), 0),
    }
  }

  const latestMeas = measurements[measurements.length - 1]
  const bmi = computeBMI(profile?.height_inches, latestMeas?.weight_lbs)

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Nutrition</h1>

      {/* Targets reminder */}
      <div className="card grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-slate-400">Daily calories</p>
          <p className="text-xl font-bold text-amber-500">3,400</p>
          <p className="text-xs text-slate-500">kcal</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Protein</p>
          <p className="text-xl font-bold text-amber-500">220</p>
          <p className="text-xs text-slate-500">g/day</p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Hydration</p>
          <p className="text-xl font-bold text-amber-500">90–180</p>
          <p className="text-xs text-slate-500">oz/day</p>
        </div>
      </div>

      {/* Supplements */}
      {supplements.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Today's Supplements</h2>
          <div className="card space-y-2">
            {supplements.map(s => {
              const log = suppLogs.find(l => l.supplement_id === s.id)
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <button
                    onClick={() => toggleSupp(s.id, log?.completed)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                      log?.completed
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-slate-500 hover:border-amber-500'
                    }`}
                  >
                    {log?.completed && (
                      <svg className="w-3 h-3 text-slate-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <div className="flex-1">
                    <span className={`font-medium text-sm ${log?.completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                      {s.name}
                    </span>
                    {s.dose && <span className="text-slate-400 text-xs ml-2">{s.dose}</span>}
                  </div>
                  <span className="text-xs text-slate-500">{s.frequency}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Meal planner */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Meal Plan</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => changeWeek(-1)} className="btn-secondary text-sm px-2 py-1">‹</button>
            <span className="text-sm text-slate-400">
              {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
            <button onClick={() => changeWeek(1)} className="btn-secondary text-sm px-2 py-1">›</button>
          </div>
        </div>
        <MealPlanner
          weekStart={weekStart}
          entries={mealPlan}
          templates={templates}
          onUpdate={loadWeekPlan}
        />
      </section>

      {/* Meal templates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Meal Templates</h2>
          <button onClick={() => { setTemplateForm({}); setShowTemplateForm(true) }} className="btn-secondary text-sm">
            + Template
          </button>
        </div>
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="card flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white text-sm">{t.name}</p>
                {t.description && <p className="text-xs text-slate-400">{t.description}</p>}
                <div className="flex gap-3 mt-0.5 text-xs text-slate-500">
                  {t.calories && <span>{t.calories} kcal</span>}
                  {t.protein_g && <span>{t.protein_g}g protein</span>}
                </div>
              </div>
              <button onClick={() => removeTemplate(t.id)} className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-slate-500 text-sm">No templates yet. Create one to quickly fill your meal plan.</p>
          )}
        </div>

        {showTemplateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="card w-full max-w-sm space-y-3">
              <h3 className="font-semibold text-white">New Meal Template</h3>
              {[['name','Name'],['description','Description']].map(([k,l]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input className="input" value={templateForm[k] || ''} onChange={e => setTemplateForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-2">
                {[['calories','Calories'],['protein_g','Protein (g)'],['carbs_g','Carbs (g)'],['fat_g','Fat (g)']].map(([k,l]) => (
                  <div key={k}>
                    <label className="label">{l}</label>
                    <input type="number" className="input" value={templateForm[k] || ''} onChange={e => setTemplateForm(f => ({ ...f, [k]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={saveTemplate} className="btn-primary flex-1">Save</button>
                <button onClick={() => setShowTemplateForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Body measurements log */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Body Measurements</h2>

        {latestMeas && (
          <div className="card grid grid-cols-3 gap-4 text-center mb-4">
            <div>
              <p className="text-xs text-slate-400">Weight</p>
              <p className="text-xl font-bold text-amber-500">{latestMeas.weight_lbs}</p>
              <p className="text-xs text-slate-500">lbs</p>
            </div>
            {latestMeas.muscle_percentage && (
              <div>
                <p className="text-xs text-slate-400">Muscle %</p>
                <p className="text-xl font-bold text-amber-500">{latestMeas.muscle_percentage}%</p>
              </div>
            )}
            {bmi && (
              <div>
                <p className="text-xs text-slate-400">BMI</p>
                <p className="text-xl font-bold text-slate-300">{bmi}</p>
              </div>
            )}
          </div>
        )}

        <div className="card space-y-3">
          <p className="text-sm font-medium text-slate-300">Log measurement</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={measForm.date}
                onChange={e => setMeasForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Weight (lb)</label>
              <input type="number" className="input" placeholder="180"
                value={measForm.weight_lbs}
                onChange={e => setMeasForm(f => ({ ...f, weight_lbs: e.target.value }))} />
            </div>
            <div>
              <label className="label">Muscle %</label>
              <input type="number" className="input" placeholder="—"
                value={measForm.muscle_percentage}
                onChange={e => setMeasForm(f => ({ ...f, muscle_percentage: e.target.value }))} />
            </div>
          </div>
          <button onClick={saveMeasurement} disabled={measSaving || !measForm.weight_lbs} className="btn-primary">
            {measSaving ? 'Saving…' : 'Save Measurement'}
          </button>
        </div>

        {/* Measurement history */}
        {measurements.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-400 text-xs border-b border-slate-700">
                  <th className="text-left pb-2">Date</th>
                  <th className="text-right pb-2">Weight</th>
                  <th className="text-right pb-2">Muscle %</th>
                  <th className="text-right pb-2">BMI</th>
                </tr>
              </thead>
              <tbody>
                {[...measurements].reverse().slice(0, 10).map(m => (
                  <tr key={m.id} className="border-t border-slate-800 text-slate-300">
                    <td className="py-1.5">{m.logged_date}</td>
                    <td className="text-right py-1.5">{m.weight_lbs} lb</td>
                    <td className="text-right py-1.5">{m.muscle_percentage ? `${m.muscle_percentage}%` : '—'}</td>
                    <td className="text-right py-1.5">{computeBMI(profile?.height_inches, m.weight_lbs) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
