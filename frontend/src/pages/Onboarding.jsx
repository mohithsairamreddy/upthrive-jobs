import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Briefcase, MapPin, Clock, User } from 'lucide-react'

const JOB_ROLES = [
  'Software Engineer', 'Senior Software Engineer', 'Full Stack Developer',
  'Frontend Developer', 'Backend Developer', 'Data Scientist', 'Data Analyst',
  'Data Engineer', 'ML Engineer', 'DevOps Engineer', 'SRE',
  'Product Manager', 'Engineering Manager', 'Android Developer',
  'iOS Developer', 'QA Engineer', 'UI/UX Designer', 'Business Analyst',
]

const LOCATIONS = [
  'Bangalore', 'Mumbai', 'Delhi/NCR', 'Hyderabad', 'Chennai',
  'Pune', 'Kolkata', 'Remote', 'Anywhere in India',
]

const JOB_TYPES = ['Full-time', 'Contract', 'Internship', 'Part-time']

const EXP_LEVELS = [
  { value: 'fresher',  label: 'Fresher (0–1 yr)' },
  { value: 'junior',  label: 'Junior (1–3 yrs)' },
  { value: 'mid',     label: 'Mid-level (3–5 yrs)' },
  { value: 'senior',  label: 'Senior (5–8 yrs)' },
  { value: 'lead',    label: 'Lead / Staff (8+ yrs)' },
]

function MultiSelect({ options, selected, onChange, label }) {
  const toggle = (v) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])

  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selected.includes(opt)
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    job_roles: [],
    locations: [],
    job_types: ['Full-time'],
    experience_level: 'mid',
    notification_email: user?.email || '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.job_roles.length === 0) {
      toast.error('Select at least one job role.')
      return
    }
    if (form.locations.length === 0) {
      toast.error('Select at least one location.')
      return
    }
    setLoading(true)
    try {
      await api.post('/settings/onboarding', form)
      toast.success('All set! Now upload your resume.')
      navigate('/resume')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-900 to-brand-700 p-4 flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Set Up Your Job Preferences</h1>
          <p className="text-brand-200 text-sm mt-1">This helps us find the most relevant jobs for you.</p>
        </div>

        <div className="card p-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Target Roles */}
            <div className="flex items-start gap-3">
              <Briefcase className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <MultiSelect
                  label="What roles are you targeting? (pick all that apply)"
                  options={JOB_ROLES}
                  selected={form.job_roles}
                  onChange={(v) => setForm({ ...form, job_roles: v })}
                />
              </div>
            </div>

            {/* Preferred Locations */}
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <MultiSelect
                  label="Preferred locations"
                  options={LOCATIONS}
                  selected={form.locations}
                  onChange={(v) => setForm({ ...form, locations: v })}
                />
              </div>
            </div>

            {/* Job Types */}
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <MultiSelect
                  label="Job types"
                  options={JOB_TYPES}
                  selected={form.job_types}
                  onChange={(v) => setForm({ ...form, job_types: v })}
                />
              </div>
            </div>

            {/* Experience Level */}
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-brand-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <label className="label">Experience level</label>
                <div className="flex flex-wrap gap-2">
                  {EXP_LEVELS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm({ ...form, experience_level: value })}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        form.experience_level === value
                          ? 'bg-brand-600 text-white border-brand-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notification Email */}
            <div>
              <label className="label">Email for daily job alerts</label>
              <input
                type="email"
                className="input"
                value={form.notification_email}
                onChange={(e) => setForm({ ...form, notification_email: e.target.value })}
                placeholder="your@email.com"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
