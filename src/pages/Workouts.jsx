import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import {
  getExercises, addExercise, getPlans, createPlan, deletePlan,
  getSessions, createSession, deleteSession,
} from '../lib/programQueries'
import { localDate } from '../lib/date'

const today = () => localDate()
const KIND_LABEL = { single: 'Exercise', superset: 'Superset', circuit: 'Circuit' }
const roundsLabel = kind => (kind === 'single' ? 'sets' : 'rounds')

const toInt = v => (v === '' || v == null ? null : parseInt(v, 10))
const toNum = v => (v === '' || v == null ? null : Number(v))

export default function Workouts() {
  const { user } = useAuth()
  const [catalog, setCatalog]   = useState([])
  const [plans, setPlans]       = useState([])
  const [sessions, setSessions] = useState([])
  const [loading, setLoading]   = useState(true)
  const [recording, setRecording] = useState(null) // a plan object being performed

  async function load() {
    const [cat, pl, ses] = await Promise.all([getExercises(), getPlans(), getSessions()])
    setCatalog(cat)
    setPlans(pl)
    setSessions(ses)
    setLoading(false)
  }
  useEffect(() => { load() }, [user?.id])

  async function onNewExercise(name, metric) {
    const ex = await addExercise(name, metric)
    setCatalog(c => (c.some(x => x.id === ex.id) ? c : [...c, ex].sort((a, b) => a.name.localeCompare(b.name))))
    return ex
  }

  if (loading) return <Spinner />

  if (recording) {
    return (
      <SessionRecorder
        plan={recording}
        onCancel={() => setRecording(null)}
        onSaved={async () => { setRecording(null); await load() }}
      />
    )
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Workouts</h1>

      <Catalog catalog={catalog} onNewExercise={onNewExercise} />

      <PlanBuilder catalog={catalog} onSaved={load} />

      {/* Plans */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Plans</h2>
        {plans.length === 0 && <p className="text-slate-400">No plans yet — build one above.</p>}
        {plans.map(p => (
          <div key={p.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{p.name}</h3>
                <p className="text-sm text-slate-400">
                  {p.groups.map(g => g.exercises.map(e => e.name).join(' + ')).join(' · ') || 'empty'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setRecording(p)} className="btn-primary text-sm">Start</button>
                <button onClick={async () => { if (confirm('Delete plan?')) { await deletePlan(p.id); load() } }}
                  className="text-sm text-red-400 hover:text-red-300">delete</button>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* History */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">History</h2>
        {sessions.length === 0 && <p className="text-slate-400">No recorded workouts yet.</p>}
        {sessions.map(s => (
          <div key={s.id} className="card">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="font-semibold text-white">
                {s.name} <span className="text-sm font-normal text-slate-400">· {s.performed_on}</span>
              </h3>
              <button onClick={async () => { if (confirm('Delete workout?')) { await deleteSession(s.id); setSessions(x => x.filter(y => y.id !== s.id)) } }}
                className="text-sm text-red-400 hover:text-red-300">delete</button>
            </div>
            <div className="space-y-2">
              {(s.data?.groups ?? []).map((g, gi) => <SessionGroupView key={gi} group={g} />)}
            </div>
          </div>
        ))}
      </section>
    </div>
  )
}

// ── Plan builder ────────────────────────────────────────────────────────────────

const emptyRow = () => ({ exercise_id: '', target_reps: '', target_weight_lbs: '', target_duration_sec: '' })

function PlanBuilder({ catalog, onSaved }) {
  const [name, setName]     = useState('')
  const [groups, setGroups] = useState([])
  const [error, setError]   = useState('')
  const [saving, setSaving] = useState(false)

  const metricOf = id => catalog.find(c => c.id === id)?.metric ?? 'weight'

  const addGroup = kind => setGroups(g => [...g, { kind, rounds: kind === 'single' ? 3 : 3, exercises: [emptyRow()] }])
  const patchGroup = (gi, patch) => setGroups(g => g.map((x, i) => (i === gi ? { ...x, ...patch } : x)))
  const removeGroup = gi => setGroups(g => g.filter((_, i) => i !== gi))
  const addRow = gi => setGroups(g => g.map((x, i) => (i === gi ? { ...x, exercises: [...x.exercises, emptyRow()] } : x)))
  const removeRow = (gi, ei) => setGroups(g => g.map((x, i) => (i === gi ? { ...x, exercises: x.exercises.filter((_, j) => j !== ei) } : x)))
  const patchRow = (gi, ei, patch) =>
    setGroups(g => g.map((x, i) => (i === gi ? { ...x, exercises: x.exercises.map((r, j) => (j === ei ? { ...r, ...patch } : r)) } : x)))

  function reset() { setName(''); setGroups([]); setError('') }

  async function save() {
    setError('')
    if (!name.trim()) { setError('Give the plan a name.'); return }
    if (groups.length === 0) { setError('Add at least one exercise, superset, or circuit.'); return }
    for (const g of groups) if (g.exercises.some(r => !r.exercise_id)) { setError('Pick an exercise for every row.'); return }

    const payload = {
      name: name.trim(),
      groups: groups.map(g => ({
        kind: g.kind,
        rounds: Number(g.rounds) || 1,
        exercises: g.exercises.map(r => ({
          exercise_id: r.exercise_id,
          target_reps: toInt(r.target_reps),
          target_weight_lbs: metricOf(r.exercise_id) === 'weight' ? toNum(r.target_weight_lbs) : null,
          target_duration_sec: metricOf(r.exercise_id) === 'duration' ? toInt(r.target_duration_sec) : null,
        })),
      })),
    }
    setSaving(true)
    try { await createPlan(payload); reset(); await onSaved() }
    catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-white">New plan</h2>

      <div>
        <label className="label">Plan name</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Leg Day" className="input" />
      </div>

      {groups.map((grp, gi) => (
        <div key={gi} className="rounded-lg border border-slate-700 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-amber-500">{KIND_LABEL[grp.kind]}</span>
              <span className="flex items-center gap-1 text-sm text-slate-300">
                <input type="number" min="1" value={grp.rounds}
                  onChange={e => patchGroup(gi, { rounds: e.target.value })} className="input w-16 py-1" />
                {roundsLabel(grp.kind)}
              </span>
            </div>
            <button onClick={() => removeGroup(gi)} className="text-sm text-red-400 hover:text-red-300">remove</button>
          </div>

          {grp.exercises.map((row, ei) => {
            const metric = metricOf(row.exercise_id)
            return (
              <div key={ei} className="flex flex-wrap items-center gap-2">
                <select value={row.exercise_id} onChange={e => patchRow(gi, ei, { exercise_id: e.target.value })}
                  className="input w-auto flex-1 min-w-[10rem] py-1">
                  <option value="">— exercise —</option>
                  {catalog.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                </select>
                <NumField value={row.target_reps} onChange={v => patchRow(gi, ei, { target_reps: v })} placeholder="reps" />
                {metric === 'weight' &&
                  <NumField value={row.target_weight_lbs} onChange={v => patchRow(gi, ei, { target_weight_lbs: v })} placeholder="lb" />}
                {metric === 'duration' &&
                  <NumField value={row.target_duration_sec} onChange={v => patchRow(gi, ei, { target_duration_sec: v })} placeholder="sec" />}
                {grp.exercises.length > 1 &&
                  <button onClick={() => removeRow(gi, ei)} className="text-slate-500 hover:text-slate-300 px-1">✕</button>}
              </div>
            )
          })}

          {grp.kind !== 'single' &&
            <button onClick={() => addRow(gi)} className="text-sm text-slate-400 hover:text-slate-200">+ add exercise</button>}
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
          <button onClick={save} disabled={saving} className="btn-primary text-sm">{saving ? 'Saving…' : 'Save plan'}</button>
          <button onClick={reset} className="btn-secondary text-sm">Clear</button>
        </div>
      )}
    </div>
  )
}

const METRIC_BADGE = { weight: 'lb', duration: 'time', none: 'reps' }

function Catalog({ catalog, onNewExercise }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Exercise catalog</h2>
        <NewExercise onNewExercise={onNewExercise} />
      </div>
      {catalog.length === 0
        ? <p className="text-slate-400 text-sm">No exercises yet — add one.</p>
        : (
          <ul className="flex flex-wrap gap-2">
            {catalog.map(ex => (
              <li key={ex.id} className="text-xs bg-slate-700 rounded-full px-3 py-1 text-slate-200">
                {ex.name} <span className="text-slate-400">· {METRIC_BADGE[ex.metric]}</span>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}

function NewExercise({ onNewExercise }) {
  const [open, setOpen]     = useState(false)
  const [name, setName]     = useState('')
  const [metric, setMetric] = useState('weight')
  async function add() {
    if (!name.trim()) return
    await onNewExercise(name.trim(), metric)
    setName(''); setMetric('weight'); setOpen(false)
  }
  if (!open) return <button onClick={() => setOpen(true)} className="btn-secondary text-sm">+ New exercise</button>
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="label">New exercise</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Plank" className="input w-32" />
      </div>
      <div>
        <label className="label">Measure</label>
        <select value={metric} onChange={e => setMetric(e.target.value)} className="input w-auto">
          <option value="weight">reps + weight</option>
          <option value="duration">reps + time</option>
          <option value="none">reps only</option>
        </select>
      </div>
      <button onClick={add} className="btn-primary text-sm">Add</button>
    </div>
  )
}

// ── Session recorder ──────────────────────────────────────────────────────────

function buildInitial(plan) {
  return plan.groups.map(g => ({
    kind: g.kind, rounds: g.rounds,
    exercises: g.exercises.map(ex => ({
      exercise_id: ex.exercise_id, name: ex.name, metric: ex.metric,
      target_reps: ex.target_reps, target_weight_lbs: ex.target_weight_lbs, target_duration_sec: ex.target_duration_sec,
      sets: Array.from({ length: g.rounds }, (_, r) => ({ round: r + 1, reps: '', weight_lbs: '', duration_sec: '' })),
    })),
  }))
}

function SessionRecorder({ plan, onCancel, onSaved }) {
  const [date, setDate]   = useState(today())
  const [notes, setNotes] = useState('')
  const [rec, setRec]     = useState(() => buildInitial(plan))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function patchSet(gi, ei, si, patch) {
    setRec(r => r.map((g, i) => i !== gi ? g : {
      ...g,
      exercises: g.exercises.map((ex, j) => j !== ei ? ex : {
        ...ex,
        sets: ex.sets.map((s, k) => (k === si ? { ...s, ...patch } : s)),
      }),
    }))
  }

  async function save() {
    setError('')
    const data = {
      groups: rec.map(g => ({
        kind: g.kind, rounds: g.rounds,
        exercises: g.exercises.map(ex => ({
          exercise_id: ex.exercise_id, name: ex.name, metric: ex.metric,
          target_reps: ex.target_reps, target_weight_lbs: ex.target_weight_lbs, target_duration_sec: ex.target_duration_sec,
          sets: ex.sets.map(s => ({
            round: s.round,
            reps: toInt(s.reps),
            weight_lbs: ex.metric === 'weight' ? toNum(s.weight_lbs) : null,
            duration_sec: ex.metric === 'duration' ? toInt(s.duration_sec) : null,
          })),
        })),
      })),
    }
    setSaving(true)
    try {
      await createSession({ plan_id: plan.id, name: plan.name, performed_on: date, notes, data })
      await onSaved()
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{plan.name}</h1>
        <button onClick={onCancel} className="text-sm text-slate-400 hover:text-slate-200">cancel</button>
      </div>

      <div>
        <label className="label">Date</label>
        <input type="date" value={date} max={today()} onChange={e => setDate(e.target.value)} className="input w-auto" />
      </div>

      {rec.map((g, gi) => (
        <div key={gi} className="card space-y-3">
          <p className="text-sm font-semibold text-amber-500">
            {KIND_LABEL[g.kind]} · {g.rounds} {roundsLabel(g.kind)}
          </p>
          {g.exercises.map((ex, ei) => (
            <div key={ei}>
              <div className="flex items-baseline justify-between mb-1">
                <span className="font-medium text-white">{ex.name}</span>
                <span className="text-xs text-slate-500">{targetLabel(ex)}</span>
              </div>
              <div className="space-y-1">
                {ex.sets.map((s, si) => (
                  <div key={si} className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 w-16">
                      {g.kind === 'single' ? 'Set' : 'Round'} {s.round}
                    </span>
                    <NumField value={s.reps} onChange={v => patchSet(gi, ei, si, { reps: v })} placeholder="reps" />
                    {ex.metric === 'weight' &&
                      <NumField value={s.weight_lbs} onChange={v => patchSet(gi, ei, si, { weight_lbs: v })} placeholder="lb" />}
                    {ex.metric === 'duration' &&
                      <NumField value={s.duration_sec} onChange={v => patchSet(gi, ei, si, { duration_sec: v })} placeholder="sec" />}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      <div>
        <label className="label">Notes (optional)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} className="input" placeholder="Felt strong" />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Save workout'}</button>
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
      </div>
    </div>
  )
}

// ── History rendering ───────────────────────────────────────────────────────────

function SessionGroupView({ group }) {
  const single = group.kind === 'single'
  return (
    <div>
      {!single && (
        <p className="text-xs font-medium text-amber-500 mb-1">{KIND_LABEL[group.kind]} · {group.rounds} rounds</p>
      )}
      <ul className={single ? '' : 'pl-3 border-l border-slate-700 space-y-1'}>
        {group.exercises.map((ex, i) => (
          <li key={i} className="text-sm text-slate-300">
            <span className="font-medium">{ex.name}</span>{' '}
            <span className="text-slate-500">
              {ex.sets.filter(hasData).map(s => formatSet(s, ex.metric)).join(', ') || '—'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const hasData = s => s.reps != null || s.weight_lbs != null || s.duration_sec != null

function formatSet(s, metric) {
  if (metric === 'duration') return `${s.duration_sec ?? '?'}s${s.reps && s.reps > 1 ? ` ×${s.reps}` : ''}`
  if (metric === 'weight')   return `${s.reps ?? '?'}${s.weight_lbs != null ? ` @${s.weight_lbs}lb` : ''}`
  return `${s.reps ?? '?'}`
}

function targetLabel(ex) {
  const parts = []
  if (ex.target_reps != null) parts.push(`${ex.target_reps} reps`)
  if (ex.metric === 'weight' && ex.target_weight_lbs != null) parts.push(`@ ${ex.target_weight_lbs} lb`)
  if (ex.metric === 'duration' && ex.target_duration_sec != null) parts.push(`${ex.target_duration_sec}s`)
  return parts.length ? `target: ${parts.join(' ')}` : ''
}

// ── Small bits ──────────────────────────────────────────────────────────────────

function NumField({ value, onChange, placeholder }) {
  return (
    <input type="number" value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)} className="input w-20 py-1 text-sm" />
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
