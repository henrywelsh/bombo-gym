import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import {
  getMe, getDailyExercises, getTodayProgress, addReps, getBoard,
  addDailyExercise, updateDailyExercise, deleteDailyExercise,
} from '../lib/programQueries'

const QUICK_ADDS = [1, 5, 10]

export default function Today() {
  const { user } = useAuth()
  const [exercises, setExercises] = useState([])
  const [counts, setCounts]       = useState({})   // exercise_id -> count
  const [streak, setStreak]       = useState(0)
  const [isAdmin, setIsAdmin]     = useState(false)
  const [loading, setLoading]     = useState(true)
  const [editing, setEditing]     = useState(false)

  async function load() {
    const [me, exs, prog, board] = await Promise.all([
      getMe(),
      getDailyExercises(),
      getTodayProgress(),
      getBoard(),
    ])
    setIsAdmin(me.isAdmin)
    setExercises(exs)
    setCounts(Object.fromEntries(prog.map(p => [p.exercise_id, p.count])))
    setStreak(board.users.find(u => u.user_id === user.id)?.streak ?? 0)
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  async function add(exerciseId, n) {
    const row = await addReps(exerciseId, n)
    setCounts(c => ({ ...c, [exerciseId]: row.count }))
  }

  if (loading) return <Spinner />

  const allDone = exercises.length > 0 && exercises.every(e => (counts[e.id] ?? 0) >= e.target)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Today's Challenge</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-2xl">🔥</span>
          <span className="font-bold text-amber-500">{streak}</span>
          <span className="text-slate-400">day{streak === 1 ? '' : 's'}</span>
        </div>
      </div>

      {allDone && (
        <div className="card bg-green-900/40 border border-green-700 text-green-300 text-sm font-medium">
          🎉 You've completed today's goal — nice work!
        </div>
      )}

      {exercises.length === 0 && (
        <p className="text-slate-400">No exercises yet. Add one below to start the challenge.</p>
      )}

      <div className="space-y-3">
        {exercises.map(ex => {
          const count = counts[ex.id] ?? 0
          const pct = Math.min(100, Math.round((count / ex.target) * 100))
          const done = count >= ex.target
          return (
            <div key={ex.id} className="card">
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-semibold text-white">{ex.name}</h3>
                <span className={`text-sm font-medium ${done ? 'text-green-400' : 'text-slate-300'}`}>
                  {count} / {ex.target} {ex.unit}
                </span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                <div
                  className={`h-full rounded-full transition-all ${done ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_ADDS.map(n => (
                  <button key={n} onClick={() => add(ex.id, n)} className="btn-secondary text-sm px-3 py-1">
                    +{n}
                  </button>
                ))}
                <CustomAdd onAdd={n => add(ex.id, n)} />
                {count > 0 && (
                  <button
                    onClick={() => add(ex.id, -count)}
                    className="text-sm text-slate-500 hover:text-slate-300 px-2 py-1 ml-auto"
                  >
                    reset
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {isAdmin && (
        <>
          <button onClick={() => setEditing(e => !e)} className="text-sm text-slate-400 hover:text-slate-200">
            {editing ? 'Done editing' : 'Edit challenge'}
          </button>
          {editing && <EditChallenge exercises={exercises} onChange={load} />}
        </>
      )}
    </div>
  )
}

function CustomAdd({ onAdd }) {
  const [value, setValue] = useState('')
  function submit(e) {
    e.preventDefault()
    const n = parseInt(value, 10)
    if (Number.isInteger(n) && n !== 0) onAdd(n)
    setValue('')
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-1">
      <input
        type="number"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="custom"
        className="input w-24 py-1 text-sm"
      />
      <button type="submit" className="btn-secondary text-sm px-3 py-1">add</button>
    </form>
  )
}

function EditChallenge({ exercises, onChange }) {
  const [name, setName]     = useState('')
  const [target, setTarget] = useState('')
  const [error, setError]   = useState('')

  async function create(e) {
    e.preventDefault()
    setError('')
    const t = parseInt(target, 10)
    if (!name.trim() || !(t > 0)) { setError('Enter a name and a positive target.'); return }
    try {
      await addDailyExercise({ name: name.trim(), target: t })
      setName(''); setTarget('')
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-white">Edit shared challenge</h3>
      <p className="text-xs text-slate-400">Everyone shares this list — changes apply to all users.</p>

      {exercises.map(ex => (
        <div key={ex.id} className="flex items-center gap-2">
          <span className="flex-1 text-slate-200">{ex.name}</span>
          <input
            type="number"
            defaultValue={ex.target}
            onBlur={e => {
              const t = parseInt(e.target.value, 10)
              if (t > 0 && t !== ex.target) updateDailyExercise(ex.id, { target: t }).then(onChange)
            }}
            className="input w-20 py-1 text-sm"
          />
          <span className="text-xs text-slate-400 w-10">{ex.unit}</span>
          <button
            onClick={() => deleteDailyExercise(ex.id).then(onChange)}
            className="text-sm text-red-400 hover:text-red-300 px-2"
          >
            remove
          </button>
        </div>
      ))}

      <form onSubmit={create} className="flex flex-wrap items-end gap-2 pt-2 border-t border-slate-700">
        <div>
          <label className="label">Exercise</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Squats" className="input w-40" />
        </div>
        <div>
          <label className="label">Daily target</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="50" className="input w-24" />
        </div>
        <button type="submit" className="btn-primary text-sm">Add</button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}
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
