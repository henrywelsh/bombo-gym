import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useAuth } from '../App'
import {
  getMe, getBenchmarks, recordBenchmark, getExercises,
  addBenchmarkExercise, removeBenchmarkExercise,
} from '../lib/programQueries'

const COLORS = [
  '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7',
  '#14b8a6', '#ef4444', '#eab308', '#8b5cf6', '#06b6d4',
]
const UNIT = { weight: 'lb', duration: 'sec', none: 'reps' }
const thisMonth = () => new Date().toISOString().slice(0, 7)

export default function Benchmarks() {
  const { user } = useAuth()
  const [data, setData]       = useState(null) // { exercises, users, results }
  const [catalog, setCatalog] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [month, setMonth]     = useState(thisMonth())
  const [draft, setDraft]     = useState({})   // exercise_id -> value for the selected month
  const [saving, setSaving]   = useState(false)

  async function load() {
    const [meRes, bm, cat] = await Promise.all([getMe(), getBenchmarks(), getExercises()])
    setIsAdmin(meRes.isAdmin)
    setData(bm)
    setCatalog(cat)
  }
  useEffect(() => { load() }, [])

  // Prefill the month form with my existing values whenever data or month changes.
  useEffect(() => {
    if (!data) return
    const mine = {}
    for (const r of data.results) {
      if (r.month === month && r.user_id === user.id) mine[r.exercise_id] = String(r.value)
    }
    setDraft(mine)
  }, [data, month, user?.id])

  if (!data) return <Spinner />

  const { exercises, users, results } = data
  const colorOf = Object.fromEntries(users.map((u, i) => [u.user_id, COLORS[i % COLORS.length]]))

  async function saveMonth() {
    setSaving(true)
    try {
      for (const ex of exercises) {
        const v = draft[ex.exercise_id]
        if (v !== undefined && v !== '') await recordBenchmark(ex.exercise_id, `${month}-01`, v)
      }
      await load()
    } finally { setSaving(false) }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Monthly Benchmark</h1>

      {exercises.length === 0 && (
        <p className="text-slate-400">No benchmark exercises yet{isAdmin ? ' — add some below.' : '.'}</p>
      )}

      {/* Record this month */}
      {exercises.length > 0 && (
        <div className="card space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">Your benchmark</h2>
            <div>
              <label className="label">Month</label>
              <input type="month" value={month} max={thisMonth()}
                onChange={e => setMonth(e.target.value)} className="input w-auto py-1" />
            </div>
          </div>
          <div className="space-y-2">
            {exercises.map(ex => (
              <div key={ex.exercise_id} className="flex items-center gap-3">
                <span className="flex-1 text-slate-200">{ex.name}</span>
                <input type="number" value={draft[ex.exercise_id] ?? ''}
                  onChange={e => setDraft(d => ({ ...d, [ex.exercise_id]: e.target.value }))}
                  className="input w-24 py-1" placeholder="—" />
                <span className="text-xs text-slate-400 w-10">{UNIT[ex.metric]}</span>
              </div>
            ))}
          </div>
          <button onClick={saveMonth} disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving…' : `Save ${month}`}
          </button>
        </div>
      )}

      {/* Progression charts */}
      {exercises.map(ex => (
        <ProgressionChart key={ex.exercise_id} exercise={ex} users={users} results={results} colorOf={colorOf} />
      ))}

      {/* Owner: manage benchmark list */}
      {isAdmin && <ManageBenchmarks exercises={exercises} catalog={catalog} onChange={load} />}
    </div>
  )
}

function ProgressionChart({ exercise, users, results, colorOf }) {
  const rows = results.filter(r => r.exercise_id === exercise.exercise_id)
  const months = [...new Set(rows.map(r => r.month))].sort()
  const unit = UNIT[exercise.metric]

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-2">
        {exercise.name} <span className="text-xs font-normal text-slate-500">({unit})</span>
      </h3>
      {months.length === 0 ? (
        <p className="text-slate-500 text-sm py-6 text-center">No benchmarks recorded yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={months.map(m => {
            const row = { month: m }
            for (const r of rows) if (r.month === m) row[r.user_id] = Number(r.value)
            return row
          })} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              labelStyle={{ color: '#e2e8f0' }} />
            <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
            {users.map(u => (
              <Line key={u.user_id} type="monotone" dataKey={u.user_id} name={u.name || 'Anonymous'}
                stroke={colorOf[u.user_id]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function ManageBenchmarks({ exercises, catalog, onChange }) {
  const [pick, setPick] = useState('')
  const benchIds = new Set(exercises.map(e => e.exercise_id))
  const available = catalog.filter(c => !benchIds.has(c.id))

  async function add() {
    if (!pick) return
    await addBenchmarkExercise(pick)
    setPick('')
    onChange()
  }

  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold text-white">Manage benchmarks</h2>
      <p className="text-xs text-slate-400">Owner only — choose which catalog exercises everyone benchmarks.</p>
      <ul className="space-y-1">
        {exercises.map(ex => (
          <li key={ex.exercise_id} className="flex items-center gap-2">
            <span className="flex-1 text-slate-200">{ex.name} <span className="text-xs text-slate-400">· {UNIT[ex.metric]}</span></span>
            <button onClick={async () => { await removeBenchmarkExercise(ex.exercise_id); onChange() }}
              className="text-sm text-red-400 hover:text-red-300">remove</button>
          </li>
        ))}
      </ul>
      <div className="flex items-end gap-2 pt-2 border-t border-slate-700">
        <select value={pick} onChange={e => setPick(e.target.value)} className="input w-auto flex-1 min-w-[10rem]">
          <option value="">— add from catalog —</option>
          {available.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={add} className="btn-primary text-sm">Add</button>
      </div>
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
