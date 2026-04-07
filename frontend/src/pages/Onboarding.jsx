import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../lib/api'
import toast from 'react-hot-toast'
import { Zap, Briefcase, MapPin, Clock, User, ArrowRight } from 'lucide-react'

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
  { value: 'fresher', label: 'Fresher',  sub: '0–1 yr'  },
  { value: 'junior',  label: 'Junior',   sub: '1–3 yrs' },
  { value: 'mid',     label: 'Mid-level',sub: '3–5 yrs' },
  { value: 'senior',  label: 'Senior',   sub: '5–8 yrs' },
  { value: 'lead',    label: 'Lead',     sub: '8+ yrs'  },
]

function Chips({ options, selected, onChange }) {
  const toggle = v => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {options.map(opt => (
        <button key={opt} type="button" onClick={() => toggle(opt)}
          className={`px-3 py-1.5 rounded-full text-sm border transition-all duration-150 ${
            selected.includes(opt)
              ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400 hover:text-brand-600'
          }`}>
          {opt}
        </button>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const { user }   = useAuth()
  const navigate   = useNavigate()
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
    if (form.job_roles.length === 0) { toast.error('Select at least one job role.'); return }
    if (form.locations.length === 0)  { toast.error('Select at least one location.'); return }
    setLoading(true)
    try {
      await api.post('/settings/onboarding', form)
      toast.success('Preferences saved! Now upload your resume.')
      navigate('/resume')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top bar */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-900 text-sm">Upthrive Jobs</span>
        </div>
        <div className="ml-auto text-xs text-slate-400">Step 1 of 2 — Preferences</div>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Set up your job preferences</h1>
            <p className="text-slate-500 text-sm mt-1">We'll use these to match you with the most relevant jobs daily.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-brand-500" />
                <h2 className="font-semibold text-slate-800">Target roles</h2>
              </div>
              <p className="text-xs text-slate-400 mb-0.5">Pick all that apply</p>
              <Chips options={JOB_ROLES} selected={form.job_roles}
                onChange={v => setForm({ ...form, job_roles: v })} />
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-brand-500" />
                <h2 className="font-semibold text-slate-800">Preferred locations</h2>
              </div>
              <Chips options={LOCATIONS} selected={form.locations}
                onChange={v => setForm({ ...form, locations: v })} />
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-brand-500" />
                <h2 className="font-semibold text-slate-800">Job type</h2>
              </div>
              <Chips options={JOB_TYPES} selected={form.job_types}
                onChange={v => setForm({ ...form, job_types: v })} />
            </div>

            <div className="card p-6">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-brand-500" />
                <h2 className="font-semibold text-slate-800">Experience level</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {EXP_LEVELS.map(({ value, label, sub }) => (
                  <button key={value} type="button"
                    onClick={() => setForm({ ...form, experience_level: value })}
                    className={`py-2.5 px-3 rounded-lg border text-sm transition-all text-center ${
                      form.experience_level === value
                        ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
                    }`}>
                    <div className="font-medium">{label}</div>
                    <div className={`text-xs mt-0.5 ${form.experience_level === value ? 'text-white/70' : 'text-slate-400'}`}>{sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="card p-6">
              <label className="label">Email for daily job alerts</label>
              <input type="email" className="input" placeholder="your@email.com"
                value={form.notification_email}
                onChange={e => setForm({ ...form, notification_email: e.target.value })}
                required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base gap-2">
              {loading ? 'Saving…' : <><span>Continue to resume upload</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
