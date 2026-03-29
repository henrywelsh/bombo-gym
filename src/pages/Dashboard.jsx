import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../App'
import {
  getTodaysSplit, getDailyStaples, getUserMilestones, getLogsForDate,
} from '../lib/programQueries'
import { currentProgramMonth, todayDayOfWeek, toDateStr } from '../lib/progressionUtils'
import ExerciseCard from '../components/ExerciseCard'

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [split, setSplit]         = useState(null)
  const [staples, setStaples]     = useState([])
  const [milestones, setMilestones] = useState([])
  const [logs, setLogs]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  const today       = new Date()
  const todayStr    = toDateStr(today)
  const dayOfWeek   = todayDayOfWeek() // 1–5 or null (weekend)
  const programMonth = currentProgramMonth(profile?.program_start_date)

  useEffect(() => {
    if (!user) return
    async function load() {
      try {
        const [staplesData, milestonesData, logsData] = await Promise.all([
          getDailyStaples(),
          getUserMilestones(user.id),
          getLogsForDate(user.id, todayStr),
        ])
        setStaples(staplesData)
        setMilestones(milestonesData)
        setLogs(logsData)

        if (dayOfWeek) {
          const splitData = await getTodaysSplit(dayOfWeek)
          setSplit(splitData)
        }
      } catch (e) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, todayStr, dayOfWeek])

  function milestonesFor(exerciseId) {
    return milestones.filter(m => m.exercise_id === exerciseId)
  }

  function loggedFor(exerciseId) {
    return logs.find(l => l.exercise_id === exerciseId) || null
  }

  // Deduplicate split exercises + staples
  const splitExercises = split?.exercises || []
  const splitIds = new Set(splitExercises.map(e => e.id))
  const extraStaples = staples.filter(s => !splitIds.has(s.id))

  if (loading) return <Spinner />
  if (error) return <ErrorMsg msg={error} />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </h1>
          <div className="flex gap-3 mt-1 text-sm text-slate-400">
            <span>Month <strong className="text-amber-500">{programMonth}</strong></span>
            {profile?.program_start_date && (
              <span>· Started {new Date(profile.program_start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
            )}
          </div>
        </div>
        <Link to="/log" className="btn-primary text-sm">+ Log</Link>
      </div>

      {/* Weekend notice */}
      {!dayOfWeek && (
        <div className="card text-center text-slate-400 py-6">
          <p className="text-2xl mb-2">🏖️</p>
          <p className="font-medium">Rest day — recovery & mobility</p>
          <p className="text-sm mt-1">Strength training Mon–Fri</p>
        </div>
      )}

      {/* Today's split */}
      {split && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-lg font-semibold text-white">{DAY_NAMES[dayOfWeek]}</h2>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-medium">
              {split.label}
            </span>
          </div>
          <div className="space-y-3">
            {splitExercises.map(ex => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                milestones={milestonesFor(ex.id)}
                currentMonth={programMonth}
                loggedToday={loggedFor(ex.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Daily staples (not already in split) */}
      {extraStaples.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold text-white mb-3">Daily Staples</h2>
          <div className="space-y-3">
            {extraStaples.map(ex => (
              <ExerciseCard
                key={ex.id}
                exercise={ex}
                milestones={milestonesFor(ex.id)}
                currentMonth={programMonth}
                loggedToday={loggedFor(ex.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Daily flow reminder */}
      <div className="card text-sm text-slate-400 space-y-1">
        <p className="text-slate-300 font-medium mb-2">Daily Flow</p>
        {[
          '1. Mobility warm-up · 15 min',
          '2. Strength session · 45 min',
          '3. Conditioning (Peloton or sport) · 30–60 min',
          '4. Mobility cool-down · 15–20 min',
        ].map(s => <p key={s}>{s}</p>)}
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

function ErrorMsg({ msg }) {
  return <div className="card text-red-400 text-sm">{msg}</div>
}
