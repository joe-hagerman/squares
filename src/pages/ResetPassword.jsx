import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      navigate('/boards', { replace: true })
    }
  }

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-5" style={{ background: 'var(--sq-bg)' }}>
      <div className="w-full max-w-sm animate-slide-up">
        <div className="rounded-sm p-8" style={{ background: 'var(--sq-surface)', border: '1px solid rgba(var(--sq-accent-rgb),0.15)' }}>
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: 'rgba(var(--sq-accent-rgb),0.6)' }}>Football Squares</p>
              <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none" style={{ color: 'var(--sq-text)' }}>New Password</h1>
              <p className="font-mono text-xs text-gray-400 mt-2">Choose a new password for your account.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                required
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none"
                style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
              />
              <input
                type="password"
                required
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none"
                style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
              />
              {error && <p className="font-mono text-xs text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full font-display font-bold text-sm tracking-[0.2em] uppercase py-3 rounded-sm transition-all disabled:opacity-50"
                style={{ background: '#f59e0b', color: '#07070e' }}
              >
                {loading ? 'Saving…' : 'Set New Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
