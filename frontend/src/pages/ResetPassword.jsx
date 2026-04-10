import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Zap, CheckCircle, XCircle } from 'lucide-react'

function Req({ met, text }) {
  return (
    <li className={`flex items-center gap-1.5 text-xs transition-colors ${met ? 'text-emerald-600' : 'text-slate-400'}`}>
      {met ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
           : <XCircle    className="w-3.5 h-3.5 flex-shrink-0" />}
      {text}
    </li>
  )
}

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [linkError, setLinkError] = useState('')
  const [ready, setReady]         = useState(false)  // token verified

  // Recovery links can be implicit (hash) or PKCE (?code=...). PKCE completes with SIGNED_IN while
  // GoTrue only emits PASSWORD_RECOVERY for implicit recovery — so we also trust getSession() after
  // initialize(), but only when the URL actually carried auth callback params (avoid treating any
  // existing login session as a reset session).
  useEffect(() => {
    const hashPart = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : ''
    const hashParams = new URLSearchParams(hashPart)
    const searchParams = new URLSearchParams(window.location.search)
    const hadAuthCallback =
      searchParams.has('code') ||
      hashParams.has('access_token') ||
      hashParams.get('type') === 'recovery'

    let cancelled = false
    const doneRef = { current: false }

    const finish = () => {
      if (cancelled || doneRef.current) return
      doneRef.current = true
      setReady(true)
    }

    const fail = (message) => {
      if (cancelled || doneRef.current) return
      doneRef.current = true
      setLinkError(message)
    }

    if (!hadAuthCallback) {
      fail('Open this page using the link from your password reset email.')
      return undefined
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') finish()
    })

    ;(async () => {
      const { error: initError } = await supabase.auth.initialize()
      if (cancelled) return
      if (initError) {
        fail(initError.message || 'Invalid or expired reset link.')
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return
      if (session) finish()
    })()

    const timer = window.setTimeout(() => {
      if (cancelled || doneRef.current) return
      fail('This reset link is invalid or has expired. Please request a new one.')
    }, 30000)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [])

  const hasMin     = password.length >= 8
  const hasUpper   = /[A-Z]/.test(password)
  const hasNum     = /[0-9]/.test(password)
  const pwMatch    = password && confirm && password === confirm

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!hasMin)    { setError('Password must be at least 8 characters.'); return }
    if (!pwMatch)   { setError("Passwords don't match."); return }
    setError('')
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setError(error.message || 'Failed to update password.')
    } else {
      navigate('/dashboard', { replace: true })
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
          <h2 className="text-2xl font-bold mb-3">Set a new password</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Choose something strong — at least 8 characters with a mix of letters, numbers, and symbols.
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

          {linkError ? (
            <div className="text-center py-10 space-y-4">
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {linkError}
              </p>
              <button
                type="button"
                className="btn-primary w-full py-2.5"
                onClick={() => navigate('/forgot-password', { replace: true })}
              >
                Request a new link
              </button>
            </div>
          ) : !ready ? (
            /* Waiting for Supabase to verify the token from URL */
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900">Set new password</h1>
              <p className="text-sm text-slate-500 mt-1 mb-8">Must be at least 8 characters.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">New password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  {password && (
                    <ul className="mt-2 space-y-1">
                      <Req met={hasMin}   text="At least 8 characters" />
                      <Req met={hasUpper} text="One uppercase letter" />
                      <Req met={hasNum}   text="One number" />
                    </ul>
                  )}
                </div>

                <div>
                  <label className="label">Confirm new password</label>
                  <input
                    type="password"
                    className="input"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  {confirm && (
                    <p className={`text-xs mt-1 flex items-center gap-1 ${pwMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                      {pwMatch
                        ? <><CheckCircle className="w-3.5 h-3.5" /> Passwords match</>
                        : 'Passwords do not match'}
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <button type="submit" disabled={loading || !hasMin || !pwMatch}
                  className="btn-primary w-full py-2.5">
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
