import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { getUserMilestones, getExerciseLogs, getBodyMeasurements, getAllExercises } from '../lib/programQueries'
import { currentProgramMonth } from '../lib/progressionUtils'
import ProgressChart from '../components/ProgressChart'

const MILESTONE_MONTHS = [0, 3, 6, 9, 12]

export default function Progress() {
  const { user, profile } = useAuth()
  const [exercises, setExercises]     = useState([])
  const [milestones, setMilestones]   = useState([])
  const [logs, setLogs]               = useState([])
  const [measurements, setMeasurements] = useState([])
  const [selected, setSelected]       = useState(null)
  const [loading, setLoading]         = useState(true)

  const programMonth = currentProgramMonth(profile?.program_start_date)

  useEffect(() => {
    if (!user) return
    async function load() {
      const [exs, ms, lg, meas] = await Promise.all([
        getAllExercises(),
        getUserMilestones(user.id),
        getExerciseLogs(user.id),
        getBodyMeasurements(user.id),
      ])
      setExercises(exs)
      setMilestones(ms)
      setLogs(lg)
      setMeasurements(meas)
      if (exs.length > 0) setSelected(exs[0].id)
      setLoading(false)
    }
    load()
  }, [user?.id])

  if (loading) return <Spinner />

  // Build chart data for selected exercise
  function exerciseChartData(exerciseId) {
    // Actual logs: use max weight per date
    const byDate = {}
    logs.filter(l => l.exercise_id === exerciseId && l.weight_lbs).forEach(l => {
      if (!byDate[l.logged_date] || l.weight_lbs > byDate[l.logged_date]) {
        byDate[l.logged_date] = l.weight_lbs
      }
    })
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))
  }

  function exerciseMilestoneData(exerciseId) {
    return milestones
      .filter(m => m.exercise_id === exerciseId && m.weight_lbs)
      .map(m => ({ month: m.month, value: m.weight_lbs }))
      .sort((a, b) => a.month - b.month)
  }

  // Body weight chart
  const weightChartData = measurements.map(m => ({
    date:  m.logged_date,
    value: m.weight_lbs,
  }))

  const muscleChartData = measurements
    .filter(m => m.muscle_percentage != null)
    .map(m => ({ date: m.logged_date, value: m.muscle_percentage }))

  const selectedEx = exercises.find(e => e.id === selected)
  const chartData  = selected ? exerciseChartData(selected) : []
  const msData     = selected ? exerciseMilestoneData(selected) : []

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Progress</h1>

      {/* Program month indicator */}
      <div className="card flex items-center gap-6">
        <div>
          <p className="text-xs text-slate-400">Program month</p>
          <p className="text-3xl font-bold text-amber-500">{programMonth}</p>
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            {MILESTONE_MONTHS.map(m => <span key={m}>M{m}</span>)}
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${(programMonth / 12) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Exercise strength chart */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Strength Progression</h2>

        {/* Exercise selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {exercises.filter(e => e.category === 'kettlebell').map(ex => (
            <button
              key={ex.id}
              onClick={() => setSelected(ex.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selected === ex.id
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {ex.name}
            </button>
          ))}
        </div>

        {selectedEx && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">{selectedEx.name}</h3>
              <span className="text-xs text-slate-400">{chartData.length} sessions logged</span>
            </div>
            {chartData.length > 0 ? (
              <ProgressChart
                data={chartData}
                milestones={msData}
                startDate={profile?.program_start_date}
                yLabel="lb"
              />
            ) : (
              <p className="text-slate-500 text-sm text-center py-8">No logs yet — start logging sessions</p>
            )}

            {/* Milestone table */}
            {msData.length > 0 && (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-slate-400 text-xs">
                      <th className="text-left pb-2">Month</th>
                      <th className="text-right pb-2">Weight</th>
                      <th className="text-right pb-2">Sets×Reps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {milestones
                      .filter(m => m.exercise_id === selected)
                      .sort((a, b) => a.month - b.month)
                      .map(m => (
                        <tr
                          key={m.month}
                          className={`border-t border-slate-700 ${m.month <= programMonth ? 'text-amber-400' : 'text-slate-400'}`}
                        >
                          <td className="py-1.5">
                            Month {m.month}
                            {m.month === programMonth && <span className="ml-2 text-xs text-amber-500">← now</span>}
                          </td>
                          <td className="text-right py-1.5">{m.weight_lbs ? `${m.weight_lbs} lb` : '—'}</td>
                          <td className="text-right py-1.5">{m.sets}×{m.reps}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Body weight chart */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-3">Body Weight</h2>
        <div className="card">
          {weightChartData.length > 0 ? (
            <ProgressChart
              data={weightChartData}
              startDate={profile?.program_start_date}
              yLabel="lb"
              goalValue={profile?.target_weight_lbs || 200}
              goalLabel={`Goal: ${profile?.target_weight_lbs || 200} lb`}
            />
          ) : (
            <p className="text-slate-500 text-sm text-center py-8">No weight logs yet — log measurements in Nutrition</p>
          )}
        </div>
      </section>

      {/* Muscle % chart */}
      {muscleChartData.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Muscle Percentage</h2>
          <div className="card">
            <ProgressChart
              data={muscleChartData}
              startDate={profile?.program_start_date}
              yLabel="%"
            />
          </div>
        </section>
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
