import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Save, Bell, Target, Calendar, MapPin } from 'lucide-react'

export default function Settings() {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/settings/')
      setSettings(data)
    } catch {
      toast.error('Failed to load settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  const save = async (field, value) => {
    setSaving(true)
    try {
      await api.patch('/settings/', { [field]: value })
      setSettings((s) => ({ ...s, [field]: value }))
      toast.success('Saved.')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  const handleRolesChange = (e) => {
    const roles = e.target.value.split('\n').map((r) => r.trim()).filter(Boolean)
    setSettings((s) => ({ ...s, job_roles: roles }))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Navbar />
        <main className="ml-56 flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Navbar />
      <main className="ml-56 flex-1 p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Settings</h1>

        <div className="space-y-5">

          {/* Match threshold */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-slate-800">Match Threshold</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              Only show (and email) jobs above this match score.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="10" max="99" step="5"
                value={settings?.match_threshold ?? 70}
                onChange={(e) => setSettings((s) => ({ ...s, match_threshold: Number(e.target.value) }))}
                className="flex-1 accent-brand-600"
              />
              <span className="text-2xl font-bold text-brand-600 w-14 text-right">
                {settings?.match_threshold ?? 70}%
              </span>
            </div>
            <button
              onClick={() => save('match_threshold', settings.match_threshold)}
              disabled={saving}
              className="btn-primary text-sm mt-3 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save threshold
            </button>
          </div>

          {/* Job retention */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-slate-800">Job History Period</h2>
            </div>
            <p className="text-sm text-slate-500 mb-4">
              How many days of matched jobs to show on the dashboard.
            </p>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1" max="30" step="1"
                value={settings?.job_retention_days ?? 7}
                onChange={(e) => setSettings((s) => ({ ...s, job_retention_days: Number(e.target.value) }))}
                className="flex-1 accent-brand-600"
              />
              <span className="text-2xl font-bold text-brand-600 w-20 text-right">
                {settings?.job_retention_days ?? 7} days
              </span>
            </div>
            <button
              onClick={() => save('job_retention_days', settings.job_retention_days)}
              disabled={saving}
              className="btn-primary text-sm mt-3 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save period
            </button>
          </div>

          {/* Email settings */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Bell className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-slate-800">Email Alerts</h2>
            </div>
            <div className="space-y-3 mt-3">
              <div>
                <label className="label">Notification email</label>
                <input
                  type="email"
                  className="input"
                  value={settings?.notification_email || ''}
                  onChange={(e) => setSettings((s) => ({ ...s, notification_email: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Frequency</label>
                <select
                  className="input"
                  value={settings?.email_frequency || 'daily'}
                  onChange={(e) => setSettings((s) => ({ ...s, email_frequency: e.target.value }))}
                >
                  <option value="daily">Daily (every morning)</option>
                  <option value="weekly">Weekly (every Monday)</option>
                  <option value="never">Never (disable emails)</option>
                </select>
              </div>
              <button
                onClick={() => save('notification_email', settings.notification_email) && save('email_frequency', settings.email_frequency)}
                disabled={saving}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save email settings
              </button>
            </div>
          </div>

          {/* Target job roles */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-1">
              <MapPin className="w-4 h-4 text-brand-500" />
              <h2 className="font-semibold text-slate-800">Target Job Roles</h2>
            </div>
            <p className="text-sm text-slate-500 mb-3">One role per line. Used for title-match bonus scoring.</p>
            <textarea
              className="input h-32 resize-none font-mono text-sm"
              value={(settings?.job_roles || []).join('\n')}
              onChange={handleRolesChange}
              placeholder={"Software Engineer\nData Scientist\nML Engineer"}
            />
            <button
              onClick={() => save('job_roles', settings.job_roles)}
              disabled={saving}
              className="btn-primary text-sm mt-3 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save roles
            </button>
          </div>

          {/* Experience level */}
          <div className="card p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Experience Level</h2>
            <select
              className="input"
              value={settings?.experience_level || 'mid'}
              onChange={(e) => setSettings((s) => ({ ...s, experience_level: e.target.value }))}
            >
              <option value="fresher">Fresher (0–1 yr)</option>
              <option value="junior">Junior (1–3 yrs)</option>
              <option value="mid">Mid-level (3–5 yrs)</option>
              <option value="senior">Senior (5–8 yrs)</option>
              <option value="lead">Lead / Staff (8+ yrs)</option>
            </select>
            <button
              onClick={() => save('experience_level', settings.experience_level)}
              disabled={saving}
              className="btn-primary text-sm mt-3 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>

        </div>
      </main>
    </div>
  )
}
