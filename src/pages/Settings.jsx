import { useEffect, useState } from 'react'
import { useAuth } from '../App'
import { upsertProfile, getSupplements, upsertSupplement, deleteSupplement } from '../lib/programQueries'
import { authClient } from '../App'

const DEFAULT_SUPPLEMENTS = [
  { name: 'Creatine Monohydrate', dose: '5g', frequency: 'Daily' },
  { name: 'Fish Oil',             dose: '2–3g', frequency: 'Daily' },
  { name: 'Vitamin D',            dose: '2,000 IU', frequency: 'Daily (if low sunlight)' },
]

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth()

  const [form, setForm] = useState({
    program_start_date: '',
    height_inches:      '',
    current_weight_lbs: '',
    target_weight_lbs:  '200',
  })
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)

  const [supplements, setSupplements]     = useState([])
  const [suppForm, setSuppForm]           = useState(null) // null = closed
  const [suppSaving, setSuppSaving]       = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        program_start_date: profile.program_start_date || '',
        height_inches:      profile.height_inches || '',
        current_weight_lbs: profile.current_weight_lbs || '',
        target_weight_lbs:  profile.target_weight_lbs || '200',
      })
    }
  }, [profile])

  useEffect(() => {
    if (!user) return
    getSupplements(user.id).then(data => {
      setSupplements(data)
    })
  }, [user?.id])

  async function saveProfile(e) {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertProfile(user.id, {
        program_start_date: form.program_start_date || null,
        height_inches:      form.height_inches ? Number(form.height_inches) : null,
        current_weight_lbs: form.current_weight_lbs ? Number(form.current_weight_lbs) : null,
        target_weight_lbs:  form.target_weight_lbs ? Number(form.target_weight_lbs) : 200,
      })
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function addDefaultSupplements() {
    for (const s of DEFAULT_SUPPLEMENTS) {
      await upsertSupplement(user.id, s)
    }
    const fresh = await getSupplements(user.id)
    setSupplements(fresh)
  }

  async function saveSupplement() {
    if (!suppForm?.name) return
    setSuppSaving(true)
    try {
      await upsertSupplement(user.id, suppForm)
      const fresh = await getSupplements(user.id)
      setSupplements(fresh)
      setSuppForm(null)
    } finally {
      setSuppSaving(false)
    }
  }

  async function removeSupp(id) {
    await deleteSupplement(id)
    setSupplements(prev => prev.filter(s => s.id !== id))
  }

  async function signOut() {
    await authClient.signOut()
  }

  // Height display helper (inches → ft'in")
  function feetInches(inches) {
    if (!inches) return ''
    const ft = Math.floor(inches / 12)
    const i  = inches % 12
    return `${ft}'${i}"`
  }

  const isFirstSetup = !profile?.program_start_date

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        {saved && <span className="text-green-400 text-sm font-medium">Saved!</span>}
      </div>

      {isFirstSetup && (
        <div className="card border border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-400 font-medium text-sm">Welcome! Set your program start date to get personalized targets.</p>
        </div>
      )}

      {/* Profile form */}
      <form onSubmit={saveProfile} className="card space-y-4">
        <h2 className="text-lg font-semibold text-white">Profile</h2>

        <div>
          <label className="label">Program Start Date</label>
          <input
            type="date"
            className="input max-w-[220px]"
            value={form.program_start_date}
            onChange={e => setForm(f => ({ ...f, program_start_date: e.target.value }))}
            required
          />
          <p className="text-xs text-slate-500 mt-1">Used to calculate your current program month and exercise targets.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Height (inches)</label>
            <input
              type="number"
              className="input"
              placeholder="75"
              value={form.height_inches}
              onChange={e => setForm(f => ({ ...f, height_inches: e.target.value }))}
            />
            {form.height_inches && (
              <p className="text-xs text-slate-500 mt-1">{feetInches(Number(form.height_inches))}</p>
            )}
          </div>
          <div>
            <label className="label">Current Weight (lb)</label>
            <input
              type="number"
              className="input"
              placeholder="180"
              value={form.current_weight_lbs}
              onChange={e => setForm(f => ({ ...f, current_weight_lbs: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Target Weight (lb)</label>
            <input
              type="number"
              className="input"
              placeholder="200"
              value={form.target_weight_lbs}
              onChange={e => setForm(f => ({ ...f, target_weight_lbs: e.target.value }))}
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving…' : 'Save Profile'}
        </button>
      </form>

      {/* Supplements */}
      <section className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Supplements & Habits</h2>
          <button onClick={() => setSuppForm({ name: '', dose: '', frequency: '', notes: '' })} className="btn-secondary text-sm">
            + Add
          </button>
        </div>

        {supplements.length === 0 && (
          <div className="space-y-2">
            <p className="text-slate-500 text-sm">No supplements added yet.</p>
            <button onClick={addDefaultSupplements} className="btn-secondary text-sm">
              Import defaults from program (creatine, fish oil, vitamin D)
            </button>
          </div>
        )}

        <div className="space-y-2">
          {supplements.map(s => (
            <div key={s.id} className="flex items-center gap-3 py-1">
              <div className="flex-1">
                <span className="font-medium text-slate-200 text-sm">{s.name}</span>
                {s.dose && <span className="text-slate-400 text-xs ml-2">{s.dose}</span>}
                {s.frequency && <span className="text-slate-500 text-xs ml-2">· {s.frequency}</span>}
                {s.notes && <p className="text-xs text-slate-500 mt-0.5">{s.notes}</p>}
              </div>
              <button
                onClick={() => setSuppForm({ ...s })}
                className="text-slate-400 hover:text-slate-200 text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => removeSupp(s.id)}
                className="text-slate-500 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Supplement form modal */}
      {suppForm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="card w-full max-w-sm space-y-3">
            <h3 className="font-semibold text-white">{suppForm.id ? 'Edit' : 'New'} Supplement</h3>
            {[['name','Name *'],['dose','Dose (e.g. 5g)'],['frequency','Frequency (e.g. Daily)'],['notes','Notes']].map(([k,l]) => (
              <div key={k}>
                <label className="label">{l}</label>
                <input className="input" value={suppForm[k] || ''} onChange={e => setSuppForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="flex gap-2">
              <button onClick={saveSupplement} disabled={suppSaving || !suppForm.name} className="btn-primary flex-1">
                {suppSaving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => setSuppForm(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Account */}
      <div className="card space-y-3">
        <h2 className="text-lg font-semibold text-white">Account</h2>
        <p className="text-slate-400 text-sm">{user?.email}</p>
        <button onClick={signOut} className="btn-secondary text-sm text-red-400 hover:text-red-300">
          Sign out
        </button>
      </div>
    </div>
  )
}
