import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import {
  getAllExercises, getUserMilestones, logExercises, getLogsForDate,
} from '../lib/programQueries'
import { currentProgramMonth, getMilestoneTargets, formatTarget, toDateStr } from '../lib/progressionUtils'

export default function LogSession() {
  const { user, profile } = useAuth()
  const [exercises, setExercises]   = useState([])
  const [milestones, setMilestones] = useState([])
  const [entries, setEntries]       = useState([])  // { exercise_id, sets, reps, weight_lbs, notes }
  const [date, setDate]             = useState(toDateStr(new Date()))
  const [saving, setSaving]         = useState(false)
  const [saved, setSaved]           = useState(false)
  const [loading, setLoading]       = useState(true)

  const programMonth = currentProgramMonth(profile?.program_start_date)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [exs, ms] = await Promise.all([
        getAllExercises(),
        getUserMilestones(user.id),
      ])
      setExercises(exs)
      setMilestones(ms)
      setLoading(false)
    }
    load()
  }, [user?.id])

  // When date changes, load existing logs for that date
  useEffect(() => {
    if (!user || loading) return
    getLogsForDate(user.id, date).then(logs => {
      if (logs.length > 0) {
        setEntries(logs.map(l => ({
          exercise_id: l.exercise_id,
          sets:        l.sets,
          reps:        l.reps,
          weight_lbs:  l.weight_lbs ?? '',
          notes:       l.notes ?? '',
        })))
      } else {
        setEntries([])
      }
    })
  }, [date, loading])

  function addExercise(exerciseId) {
    if (entries.find(e => e.exercise_id === exerciseId)) return
    const ms = milestones.filter(m => m.exercise_id === exerciseId)
    const { current } = getMilestoneTargets(ms, programMonth)
    setEntries(prev => [...prev, {
      exercise_id: exerciseId,
      sets:        current?.sets || '',
      reps:        current?.reps || '',
      weight_lbs:  current?.weight_lbs || '',
      notes:       '',
    }])
  }

  function removeEntry(exerciseId) {
    setEntries(prev => prev.filter(e => e.exercise_id !== exerciseId))
  }

  function updateEntry(exerciseId, field, value) {
    setEntries(prev => prev.map(e =>
      e.exercise_id === exerciseId ? { ...e, [field]: value } : e
    ))
  }

  async function handleSave() {
    if (entries.length === 0) return
    setSaving(true)
    try {
      await logExercises(
        user.id,
        date,
        entries.map(e => ({
          exercise_id: e.exercise_id,
          sets:        Number(e.sets) || 0,
          reps:        Number(e.reps) || 0,
          weight_lbs:  e.weight_lbs ? Number(e.weight_lbs) : null,
          notes:       e.notes || null,
        }))
      )
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  const addedIds = new Set(entries.map(e => e.exercise_id))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Log Session</h1>
        {saved && <span className="text-green-400 text-sm font-medium">Saved!</span>}
      </div>

      {/* Date */}
      <div>
        <label className="label">Date</label>
        <input
          type="date"
          className="input max-w-[180px]"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>

      {/* Logged entries */}
      {entries.length > 0 && (
        <div className="space-y-4">
          {entries.map(entry => {
            const ex = exercises.find(e => e.id === entry.exercise_id)
            const ms = milestones.filter(m => m.exercise_id === entry.exercise_id)
            const { current } = getMilestoneTargets(ms, programMonth)
            if (!ex) return null
            return (
              <div key={entry.exercise_id} className="card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{ex.name}</h3>
                    {current && (
                      <p className="text-xs text-slate-400">Target: {formatTarget(current)}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeEntry(entry.exercise_id)}
                    className="text-slate-500 hover:text-red-400 transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="label">Sets</label>
                    <input type="number" min="0" className="input"
                      value={entry.sets}
                      onChange={e => updateEntry(entry.exercise_id, 'sets', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Reps</label>
                    <input type="number" min="0" className="input"
                      value={entry.reps}
                      onChange={e => updateEntry(entry.exercise_id, 'reps', e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Weight (lb)</label>
                    <input type="number" min="0" className="input" placeholder="—"
                      value={entry.weight_lbs}
                      onChange={e => updateEntry(entry.exercise_id, 'weight_lbs', e.target.value)} />
                  </div>
                </div>

                <div>
                  <label className="label">Notes</label>
                  <input type="text" className="input" placeholder="Form notes, how it felt…"
                    value={entry.notes}
                    onChange={e => updateEntry(entry.exercise_id, 'notes', e.target.value)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add exercise */}
      <div className="card">
        <p className="text-sm font-medium text-slate-300 mb-3">Add exercise</p>
        <div className="flex flex-wrap gap-2">
          {exercises.map(ex => (
            <button
              key={ex.id}
              onClick={() => addExercise(ex.id)}
              disabled={addedIds.has(ex.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                addedIds.has(ex.id)
                  ? 'bg-slate-700 text-slate-500 cursor-default'
                  : 'bg-slate-700 hover:bg-amber-500 hover:text-slate-900 text-slate-200'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || entries.length === 0}
        className="btn-primary w-full text-base py-3"
      >
        {saving ? 'Saving…' : 'Save Session'}
      </button>
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
