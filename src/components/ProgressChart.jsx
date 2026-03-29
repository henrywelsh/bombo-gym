import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Legend,
} from 'recharts'

const MILESTONE_MONTHS = [0, 3, 6, 9, 12]
const COLORS = {
  actual:    '#f59e0b', // amber
  milestone: '#64748b', // slate
  goal:      '#22c55e', // green
}

/**
 * Generic progress line chart.
 *
 * Props:
 *   data         - array of { date, value } — actual logged values
 *   milestones   - array of { month, value } — target milestone points
 *   startDate    - program start date string (for milestone x-axis positioning)
 *   yLabel       - string for y-axis label
 *   goalValue    - optional horizontal reference line (e.g. 200 lb body weight goal)
 *   goalLabel    - label for the goal line
 */
export default function ProgressChart({
  data = [],
  milestones = [],
  startDate,
  yLabel = '',
  goalValue,
  goalLabel = 'Goal',
}) {
  // Convert milestone months to approximate dates for x-axis alignment
  const milestoneData = milestones.map(m => {
    if (!startDate) return null
    const d = new Date(startDate)
    d.setMonth(d.getMonth() + m.month)
    return { date: d.toISOString().slice(0, 10), value: m.value, isMilestone: true }
  }).filter(Boolean)

  // Merge actual + milestone data, sorted by date
  const merged = [...data.map(d => ({ ...d, type: 'actual' })),
                  ...milestoneData.map(d => ({ ...d, type: 'milestone' }))]
    .sort((a, b) => a.date.localeCompare(b.date))

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm">
        <p className="text-slate-400 mb-1">{label}</p>
        {payload.map(p => (
          <p key={p.name} style={{ color: p.color }}>
            {p.name}: <strong>{p.value} {yLabel}</strong>
          </p>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={merged} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          tickFormatter={d => d.slice(5)} // MM-DD
        />
        <YAxis
          tick={{ fill: '#94a3b8', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          unit={` ${yLabel}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
        />
        {goalValue && (
          <ReferenceLine
            y={goalValue}
            stroke={COLORS.goal}
            strokeDasharray="5 5"
            label={{ value: goalLabel, fill: COLORS.goal, fontSize: 11, position: 'right' }}
          />
        )}
        <Line
          type="monotone"
          dataKey="value"
          name="Logged"
          stroke={COLORS.actual}
          strokeWidth={2}
          dot={{ r: 3, fill: COLORS.actual }}
          activeDot={{ r: 5 }}
          connectNulls={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
