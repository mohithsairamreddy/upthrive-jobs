import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'
import { Briefcase, CheckCircle, XCircle } from 'lucide-react'

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' }
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' }
  if (score <= 3) return { score, label: 'Fair', color: 'bg-amber-400' }
  if (score === 4) return { score, label: 'Good', color: 'bg-blue-500' }
  return { score, label: 'Strong', color: 'bg-green-500' }
}

function PasswordRequirement({ met, text }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs ${met ? 'text-green-600' : 'text-slate-400'}`}>
      {met
        ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
        : <XCircle className="w-3.5 h-3.5 flex-shrink-0" />}
      {text}
    </li>
  )
}

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(form.password)
  const hasMinLength = form.password.length >= 8
  const hasUppercase = /[A-Z]/.test(form.password)
  const hasNumber = /[0-9]/.test(form.password)
  // Special characters are allowed and encouraged — no restrictions
  const hasSpecial = /[^A-Za-z0-9]/.test(form.password)
  const passwordsMatch = form.password && form.confirm && form.password === form.confirm

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (form.password !== form.confirm) {
      toast.error("Passwords don't match. Please re-enter your password.")
      return
    }
    if (form.password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }

    setLoading(true)
    const { error } = await signUp(form.email, form.password)
    setLoading(false)

    if (error) {
      // Provide specific, human-readable error messages
      if (error.message?.toLowerCase().includes('already registered')) {
        toast.error('An account with this email already exists. Try signing in instead.')
      } else if (error.message?.toLowerCase().includes('invalid email')) {
        toast.error('Please enter a valid email address.')
      } else if (error.message?.toLowerCase().includes('password')) {
        toast.error(`Password issue: ${error.message}`)
      } else {
        toast.error(error.message || 'Registration failed. Please try again.')
      }
    } else {
      toast.success('Account created! Set up your preferences.')
      navigate('/onboarding')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-700 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-3">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Upthrive Jobs</h1>
          <p className="text-brand-200 text-sm mt-1">Create your free account</p>
        </div>

        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">Create account</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="At least 8 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
              {/* Password strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${
                          i <= strength.score ? strength.color : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    Strength: <span className="font-medium">{strength.label}</span>
                  </p>
                </div>
              )}
              {/* Requirements checklist */}
              {form.password && (
                <ul className="mt-2 space-y-1">
                  <PasswordRequirement met={hasMinLength} text="At least 8 characters" />
                  <PasswordRequirement met={hasUppercase} text="One uppercase letter" />
                  <PasswordRequirement met={hasNumber} text="One number" />
                  <PasswordRequirement met={hasSpecial} text="Special character (optional but recommended)" />
                </ul>
              )}
            </div>

            <div>
              <label className="label">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
              {form.confirm && !passwordsMatch && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
              )}
              {form.confirm && passwordsMatch && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Passwords match
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !hasMinLength}
              className="btn-primary w-full py-2.5 mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
          <p className="text-center text-sm text-slate-500 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
