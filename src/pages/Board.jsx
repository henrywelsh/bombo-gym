import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getBoard } from '../lib/programQueries'

const COLORS = ['#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7', '#14b8a6']
const today = () => new Date().toISOString().slice(0, 10)

export default function Board() {
  const [date, setDate]   = useState(today())
  const [board, setBoard] = useState(null)

  useEffect(() => {
    setBoard(null)
    getBoard(date).then(setBoard)
  }, [date])

  if (!board) return <Spinner />

  const { exercises, users } = board

  // One row per user; each exercise is a series keyed by its name.
  const chartData = users.map(u => {
    const row = { name: u.name || 'Anonymous' }
    for (const ex of exercises) row[ex.name] = u.counts[ex.id] ?? 0
    return row
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Daily Board</h1>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={e => setDate(e.target.value)}
          className="input w-auto py-1 text-sm"
        />
      </div>

      {users.length === 0 ? (
        <p className="text-slate-400">Nobody has logged anything for this day yet.</p>
      ) : (
        <>
          <div className="card">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
                {exercises.map((ex, i) => (
                  <Bar key={ex.id} dataKey={ex.name} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 mt-2">
              Targets: {exercises.map(e => `${e.name} ${e.target}`).join(' · ')}
            </p>
          </div>

          {/* Per-exercise streaks */}
          <div className="card">
            <h2 className="font-semibold text-white mb-3">Streaks</h2>
            <ul className="divide-y divide-slate-700">
              {users.map(u => (
                <li key={u.user_id} className="flex items-center gap-3 py-2">
                  {u.image
                    ? <img src={u.image} alt="" className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-slate-600" />}
                  <span className="flex-1 text-slate-200">{u.name || 'Anonymous'}</span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {exercises.map(ex => (
                      <span key={ex.id} className="text-xs text-slate-400">
                        {ex.name} <span className="text-amber-500 font-medium">🔥 {u.streaks?.[ex.id] ?? 0}</span>
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
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
