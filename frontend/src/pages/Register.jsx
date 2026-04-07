import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Zap, CheckCircle, XCircle } from 'lucide-react'

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8)          s++
  if (pw.length >= 12)         s++
  if (/[A-Z]/.test(pw))        s++
  if (/[0-9]/.test(pw))        s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  if (s <= 1) return { score: s, label: 'Weak',   color: 'bg-red-500' }
  if (s <= 3) return { score: s, label: 'Fair',   color: 'bg-amber-400' }
  if (s === 4) return { score: s, label: 'Good',  color: 'bg-brand-500' }
  return              { score: s, label: 'Strong', color: 'bg-emerald-500' }
}

function Req({ met, text }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
      {met ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
           : <XCircle    className="w-3.5 h-3.5 flex-shrink-0" />}
      {text}
    </li>
  )
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate   = useNavigate()
  const [form, setForm]       = useState({ email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const strength      = getStrength(form.password)
  const hasMin        = form.password.length >= 8
  const hasUpper      = /[A-Z]/.test(form.password)
  const hasNum        = /[0-9]/.test(form.password)
  const hasSpecial    = /[^A-Za-z0-9]/.test(form.password)
  const pwMatch       = form.password && form.confirm && form.password === form.confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) { toast.error("Passwords don't match."); return }
    if (!hasMin) { toast.error('Password must be at least 8 characters.'); return }
    setLoading(true)
    const { error } = await signUp(form.email, form.password)
    setLoading(false)
    if (error) {
      if (error.message?.toLowerCase().includes('already registered'))
        toast.error('Account already exists. Try signing in.')
      else
        toast.error(error.message || 'Registration failed. Please try again.')
    } else {
      toast.success('Account created!')
      navigate('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] bg-brand-600 p-10 text-white flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Upthrive Jobs</span>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-3">Find your next role faster</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            We scrape 60+ Indian company career pages daily, match jobs to your resume, and deliver only the freshest listings — ghost jobs filtered out.
          </p>
          <div className="mt-6 space-y-3">
            {['Upload resume once — matched daily', 'Only jobs posted in last 7 days', 'No recruiters, no agencies'].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-white/80">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>
                {f}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-white/40">Free forever · No credit card</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Upthrive Jobs</span>
          </div>

          <h1 className="text-2xl font-bold text-slate-900">Create account</h1>
          <p className="text-sm text-slate-500 mt-1 mb-8">Free forever · No credit card needed</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                required autoFocus />
            </div>

            <div>
              <label className="label">Password</label>
              <input type="password" className="input" placeholder="At least 8 characters"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                required />
              {form.password && (
                <>
                  <div className="flex gap-1 mt-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.score ? strength.color : 'bg-slate-200'
                      }`} />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Strength: <span className="font-medium">{strength.label}</span></p>
                  <ul className="mt-2 space-y-1">
                    <Req met={hasMin}     text="At least 8 characters" />
                    <Req met={hasUpper}   text="One uppercase letter" />
                    <Req met={hasNum}     text="One number" />
                    <Req met={hasSpecial} text="Special character (optional)" />
                  </ul>
                </>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input type="password" className="input" placeholder="••••••••"
                value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                required />
              {form.confirm && (
                <p className={`text-xs mt-1 flex items-center gap-1 ${pwMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                  {pwMatch
                    ? <><CheckCircle className="w-3.5 h-3.5" /> Passwords match</>
                    : 'Passwords do not match'}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading || !hasMin} className="btn-primary w-full py-2.5 mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
