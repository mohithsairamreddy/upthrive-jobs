import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Zap, ArrowLeft, Mail } from 'lucide-react'

export default function ForgotPassword() {
  const { sendPasswordReset } = useAuth()
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)
  const [error, setError]   = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await sendPasswordReset(email)
    setLoading(false)
    if (error) {
      setError(error.message || 'Failed to send reset email. Please try again.')
    } else {
      setSent(true)
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
          <h2 className="text-2xl font-bold mb-3">Reset your password</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Enter your email and we'll send you a secure link to set a new password.
            The link expires in 1 hour.
          </p>
        </div>
        <p className="text-xs text-white/40">Upthrive Jobs · Free forever</p>
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

          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Check your inbox</h1>
              <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                We sent a password reset link to <span className="font-medium text-slate-700">{email}</span>.
                Check your spam folder if you don't see it within a minute.
              </p>
              <p className="text-xs text-slate-400 mt-4">
                Link expires in 1 hour.
              </p>
              <Link to="/login"
                className="btn-secondary mt-6 w-full justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <h1 className="text-2xl font-bold text-slate-900">Forgot password?</h1>
              <p className="text-sm text-slate-500 mt-1 mb-8">
                Enter your email and we'll send a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email address</label>
                  <input
                    type="email"
                    className="input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>

              <Link to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mt-6 transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
