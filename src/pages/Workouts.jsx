import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import {
  getExercises, addExercise, getWorkouts, createWorkout, deleteWorkout,
} from '../lib/programQueries'

const today = () => new Date().toISOString().slice(0, 10)
const KIND_LABEL = { single: 'Exercise', superset: 'Superset', circuit: 'Circuit' }

const emptyRow = () => ({ exercise_id: '', sets: '', reps: '', weight_lbs: '' })

export default function Workouts() {
  const { user } = useAuth()
  const [catalog, setCatalog]   = useState([])
  const [workouts, setWorkouts] = useState([])
  const [loading, setLoading]   = useState(true)

  // Builder state
  const [date, setDate]     = useState(today())
  const [name, setName]     = useState('')
  const [groups, setGroups] = useState([])
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [cat, ws] = await Promise.all([getExercises(), getWorkouts()])
    setCatalog(cat)
    setWorkouts(ws)
    setLoading(false)
  }
  useEffect(() => { load() }, [user?.id])

  // ── Builder helpers ──────────────────────────────────────────────────────────
  function addGroup(kind) {
    setGroups(g => [...g, { kind, rounds: kind === 'single' ? 1 : 3, exercises: [emptyRow()] }])
  }
  function patchGroup(gi, patch) {
    setGroups(g => g.map((grp, i) => (i === gi ? { ...grp, ...patch } : grp)))
  }
  function removeGroup(gi) {
    setGroups(g => g.filter((_, i) => i !== gi))
  }
  function addRow(gi) {
    setGroups(g => g.map((grp, i) => (i === gi ? { ...grp, exercises: [...grp.exercises, emptyRow()] } : grp)))
  }
  function patchRow(gi, ei, patch) {
    setGroups(g => g.map((grp, i) =>
      i === gi ? { ...grp, exercises: grp.exercises.map((r, j) => (j === ei ? { ...r, ...patch } : r)) } : grp))
  }
  function removeRow(gi, ei) {
    setGroups(g => g.map((grp, i) =>
      i === gi ? { ...grp, exercises: grp.exercises.filter((_, j) => j !== ei) } : grp))
  }

  async function createNewExercise(gi, ei) {
    const n = window.prompt('New exercise name')
    if (!n?.trim()) return
    const ex = await addExercise(n.trim())
    setCatalog(c => (c.some(x => x.id === ex.id) ? c : [...c, ex].sort((a, b) => a.name.localeCompare(b.name))))
    patchRow(gi, ei, { exercise_id: ex.id })
  }

  function reset() {
    setDate(today()); setName(''); setGroups([]); setError('')
  }

  async function save() {
    setError('')
    if (groups.length === 0) { setError('Add at least one exercise, superset, or circuit.'); return }
    for (const grp of groups) {
      if (grp.exercises.some(r => !r.exercise_id)) { setError('Pick an exercise for every row.'); return }
    }
    const payload = {
      performed_on: date,
      name: name.trim() || null,
      groups: groups.map(grp => ({
        kind: grp.kind,
        rounds: grp.kind === 'single' ? 1 : Number(grp.rounds) || 1,
        exercises: grp.exercises.map(r => ({
          exercise_id: r.exercise_id,
          sets:       grp.kind === 'single' ? toInt(r.sets) : null,
          reps:       toInt(r.reps),
          weight_lbs: toNum(r.weight_lbs),
        })),
      })),
    }
    setSaving(true)
    try {
      await createWorkout(payload)
      reset()
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function remove(id) {
    if (!window.confirm('Delete this workout?')) return
    await deleteWorkout(id)
    setWorkouts(ws => ws.filter(w => w.id !== id))
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Workouts</h1>

      {/* ── Builder ── */}
      <div className="card space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Date</label>
            <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} className="input w-auto" />
          </div>
          <div className="flex-1 min-w-[8rem]">
            <label className="label">Name (optional)</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Leg day" className="input" />
          </div>
        </div>

        {groups.map((grp, gi) => (
          <div key={gi} className="rounded-lg border border-slate-700 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-amber-500">{KIND_LABEL[grp.kind]}</span>
                {grp.kind !== 'single' && (
                  <span className="flex items-center gap-1 text-sm text-slate-300">
                    <input
                      type="number" min="1" value={grp.rounds}
                      onChange={e => patchGroup(gi, { rounds: e.target.value })}
                      className="input w-16 py-1"
                    />
                    rounds
                  </span>
                )}
              </div>
              <button onClick={() => removeGroup(gi)} className="text-sm text-red-400 hover:text-red-300">remove</button>
            </div>

            {grp.exercises.map((row, ei) => (
              <div key={ei} className="flex flex-wrap items-center gap-2">
                <select
                  value={row.exercise_id}
                  onChange={e => {
                    if (e.target.value === '__new') createNewExercise(gi, ei)
                    else patchRow(gi, ei, { exercise_id: e.target.value })
                  }}
                  className="input w-auto flex-1 min-w-[10rem] py-1"
                >
                  <option value="">— exercise —</option>
                  {catalog.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                  <option value="__new">+ New exercise…</option>
                </select>
                {grp.kind === 'single' && (
                  <NumberField value={row.sets} onChange={v => patchRow(gi, ei, { sets: v })} placeholder="sets" />
                )}
                <NumberField value={row.reps} onChange={v => patchRow(gi, ei, { reps: v })} placeholder="reps" />
                <NumberField value={row.weight_lbs} onChange={v => patchRow(gi, ei, { weight_lbs: v })} placeholder="lb" />
                {grp.exercises.length > 1 && (
                  <button onClick={() => removeRow(gi, ei)} className="text-slate-500 hover:text-slate-300 px-1">✕</button>
                )}
              </div>
            ))}

            {grp.kind !== 'single' && (
              <button onClick={() => addRow(gi)} className="text-sm text-slate-400 hover:text-slate-200">+ add exercise</button>
            )}
          </div>
        ))}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => addGroup('single')} className="btn-secondary text-sm">+ Exercise</button>
          <button onClick={() => addGroup('superset')} className="btn-secondary text-sm">+ Superset</button>
          <button onClick={() => addGroup('circuit')} className="btn-secondary text-sm">+ Circuit</button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {groups.length > 0 && (
          <div className="flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving…' : 'Save workout'}
            </button>
            <button onClick={reset} className="btn-secondary text-sm">Clear</button>
          </div>
        )}
      </div>

      {/* ── History ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">History</h2>
        {workouts.length === 0 && <p className="text-slate-400">No workouts logged yet.</p>}
        {workouts.map(w => (
          <div key={w.id} className="card">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold text-white">
                {w.name || 'Workout'} <span className="text-sm font-normal text-slate-400">· {w.performed_on}</span>
              </h3>
              <button onClick={() => remove(w.id)} className="text-sm text-red-400 hover:text-red-300">delete</button>
            </div>
            <div className="space-y-2">
              {w.groups.map(g => <GroupView key={g.id} group={g} />)}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

function GroupView({ group }) {
  const single = group.kind === 'single'
  return (
    <div>
      {!single && (
        <p className="text-xs font-medium text-amber-500 mb-1">
          {KIND_LABEL[group.kind]} · {group.rounds} rounds
        </p>
      )}
      <ul className={single ? '' : 'pl-3 border-l border-slate-700 space-y-0.5'}>
        {group.exercises.map(ex => (
          <li key={ex.id} className="text-sm text-slate-300">
            {ex.name}
            <span className="text-slate-500"> — {formatSetsReps(ex, single)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatSetsReps(ex, single) {
  const parts = []
  if (single && ex.sets) parts.push(`${ex.sets}×${ex.reps ?? '?'}`)
  else if (ex.reps) parts.push(`${ex.reps} reps`)
  if (ex.weight_lbs) parts.push(`@ ${ex.weight_lbs} lb`)
  return parts.join(' ') || '—'
}

function NumberField({ value, onChange, placeholder }) {
  return (
    <input
      type="number" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="input w-16 py-1 text-sm"
    />
  )
}

const toInt = v => (v === '' || v == null ? null : parseInt(v, 10))
const toNum = v => (v === '' || v == null ? null : Number(v))

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
