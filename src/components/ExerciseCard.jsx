import { getMilestoneTargets, formatTarget } from '../lib/progressionUtils'

/**
 * Displays an exercise with its current milestone target and next milestone.
 *
 * Props:
 *   exercise     - { id, name, category, notes }
 *   milestones   - array of milestone rows for this exercise
 *   currentMonth - program month (0-12)
 *   loggedToday  - { sets, reps, weight_lbs } or null
 */
export default function ExerciseCard({ exercise, milestones = [], currentMonth, loggedToday }) {
  const { current, next } = getMilestoneTargets(milestones, currentMonth)

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-white text-base">{exercise.name}</h3>
          {exercise.notes && (
            <p className="text-xs text-slate-400 mt-0.5">{exercise.notes}</p>
          )}
        </div>
        <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full capitalize shrink-0">
          {exercise.category}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-slate-700/50 rounded-lg p-2">
          <p className="text-xs text-slate-400 mb-0.5">Current target</p>
          <p className="font-semibold text-amber-400 text-sm">{formatTarget(current)}</p>
          {current && <p className="text-xs text-slate-500">Month {current.month}</p>}
        </div>
        {next && (
          <div className="bg-slate-700/50 rounded-lg p-2">
            <p className="text-xs text-slate-400 mb-0.5">Next milestone</p>
            <p className="font-semibold text-slate-300 text-sm">{formatTarget(next)}</p>
            <p className="text-xs text-slate-500">Month {next.month}</p>
          </div>
        )}
      </div>

      {loggedToday && (
        <div className="flex items-center gap-2 text-sm">
          <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className="text-green-400 font-medium">
            Logged: {loggedToday.weight_lbs ? `${loggedToday.weight_lbs} lb · ` : ''}
            {loggedToday.sets}×{loggedToday.reps}
          </span>
        </div>
      )}
    </div>
  )
}
