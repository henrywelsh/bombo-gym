import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getBoard } from '../lib/programQueries'
import { localDate } from '../lib/date'

// Stable per-user palette.
const COLORS = [
  '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#a855f7',
  '#14b8a6', '#ef4444', '#eab308', '#8b5cf6', '#06b6d4',
]
const today = () => localDate()

export default function Board() {
  const [date, setDate]   = useState(today())
  const [board, setBoard] = useState(null)

  useEffect(() => {
    setBoard(null)
    getBoard(date).then(setBoard)
  }, [date])

  if (!board) return <Spinner />

  const { exercises, users } = board
  const colorOf = Object.fromEntries(users.map((u, i) => [u.user_id, COLORS[i % COLORS.length]]))

  // One row per exercise; each user is a colored series.
  const chartData = exercises.map(ex => {
    const row = { name: ex.name }
    for (const u of users) row[u.user_id] = u.counts[ex.id] ?? 0
    return row
  })

  const ranked = [...users].sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <input
          type="date"
          value={date}
          max={today()}
          onChange={e => setDate(e.target.value)}
          className="input w-auto py-1 text-sm"
        />
      </div>

      {users.length === 0 ? (
        <p className="text-slate-400">Nobody has logged anything yet.</p>
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
                {users.map(u => (
                  <Bar key={u.user_id} dataKey={u.user_id} name={u.name || 'Anonymous'}
                    fill={colorOf[u.user_id]} radius={[4, 4, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-slate-500 mt-2">
              {date} · targets {exercises.map(e => `${e.name} ${e.target}`).join(' · ')}
            </p>
          </div>

          {/* Standings */}
          <div className="card">
            <h2 className="font-semibold text-white mb-1">Standings</h2>
            <p className="text-xs text-slate-500 mb-3">Current streak per exercise</p>
            <ul className="divide-y divide-slate-700">
              {ranked.map(u => (
                <li key={u.user_id} className="flex items-start gap-3 py-3">
                  <span className="w-3 h-3 rounded-full shrink-0 mt-1.5" style={{ background: colorOf[u.user_id] }} />
                  {u.image
                    ? <img src={u.image} alt="" className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-slate-600" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-200 truncate">{u.name || 'Anonymous'}</p>
                    <div className="mt-1 space-y-1">
                      {exercises.map(ex => (
                        <div key={ex.id} className="flex items-baseline gap-2 text-sm">
                          <span className="text-slate-300 flex-1 min-w-0 truncate">{ex.name}</span>
                          <span className="text-xs text-slate-400">🔥 {u.streaks?.[ex.id] ?? 0}</span>
                        </div>
                      ))}
                    </div>
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
