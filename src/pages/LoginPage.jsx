import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [mode, setMode] = useState('signin') // 'signin' | 'register' | 'forgot' | 'resetSent' | 'awaitingConfirmation'

  function switchMode(next) {
    setError(null)
    setPassword('')
    setConfirm('')
    setMode(next)
  }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Incorrect email or password.' : friendlyError(error, 'auth'))
    } else {
      navigate(from, { replace: true })
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    if (password !== confirm) return setError('Passwords do not match.')
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) {
      setError(friendlyError(error, 'auth'))
    } else if (data?.user?.identities?.length === 0) {
      setError('An account with this email already exists.')
    } else {
      navigate(from, { replace: true })
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback`,
    })
    setLoading(false)
    if (error) {
      setError(friendlyError(error, 'auth'))
    } else {
      setMode('resetSent')
    }
  }

  async function handleGoogle() {
    setError(null)
    if (from !== '/') sessionStorage.setItem('auth_redirect', from)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(friendlyError(error, 'auth'))
  }

  if (mode === 'resetSent') {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <p className="font-display text-2xl font-bold tracking-wider uppercase" style={{ color: 'var(--sq-text)' }}>Check your email</p>
          <p className="font-mono text-sm text-gray-400">We sent a password reset link to <span style={{ color: 'var(--sq-accent)' }}>{email}</span>.</p>
          <button onClick={() => switchMode('signin')} className="font-mono text-xs tracking-widest uppercase" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--sq-accent-rgb),0.6)', padding: 0 }}>
            Back to sign in
          </button>
        </div>
      </Shell>
    )
  }

  if (mode === 'forgot') {
    return (
      <Shell>
        <div className="space-y-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: 'rgba(var(--sq-accent-rgb),0.6)' }}>Football Squares</p>
            <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none" style={{ color: 'var(--sq-text)' }}>Reset Password</h1>
            <p className="font-mono text-xs text-gray-400 mt-2">Enter your email and we'll send you a reset link.</p>
          </div>
          <form onSubmit={handleForgot} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
            />
            {error && <p className="font-mono text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full font-display font-bold text-sm tracking-[0.2em] uppercase py-3 rounded-sm transition-all disabled:opacity-50" style={{ background: '#f59e0b', color: '#07070e' }}>
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
          <button onClick={() => switchMode('signin')} className="font-mono text-xs tracking-widest uppercase w-full text-center" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--sq-accent-rgb),0.6)', padding: 0 }}>
            ← Back to sign in
          </button>
        </div>
      </Shell>
    )
  }

  if (mode === 'register') {
    return (
      <Shell>
        <div className="space-y-6">
          <div>
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: 'rgba(var(--sq-accent-rgb),0.6)' }}>Football Squares</p>
            <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none" style={{ color: 'var(--sq-text)' }}>Create Account</h1>
          </div>
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              aria-label="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
            />
            <input
              type="password"
              required
              placeholder="Password"
              aria-label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
            />
            <input
              type="password"
              required
              placeholder="Confirm password"
              aria-label="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
              style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
            />
            {error && <p className="font-mono text-xs text-red-400">{error}</p>}
            <button type="submit" disabled={loading} className="w-full font-display font-bold text-sm tracking-[0.2em] uppercase py-3 rounded-sm transition-all disabled:opacity-50" style={{ background: '#f59e0b', color: '#07070e' }}>
              {loading ? 'Please wait…' : 'Create Account'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--sq-alpha),0.08)' }} />
            <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(var(--sq-alpha),0.08)' }} />
          </div>

          <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 font-display font-semibold text-sm tracking-wider uppercase py-3 rounded-sm transition-all" style={{ background: 'rgba(var(--sq-alpha),0.04)', border: '1px solid rgba(var(--sq-alpha),0.1)', color: 'var(--sq-text)' }}>
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="font-mono text-xs text-center text-gray-500">
            Already have an account?{' '}
            <button onClick={() => switchMode('signin')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--sq-accent-rgb),0.7)', padding: 0 }} className="font-mono text-xs">
              Sign in
            </button>
          </p>
        </div>
      </Shell>
    )
  }

  // signin (default)
  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase mb-1" style={{ color: 'rgba(var(--sq-accent-rgb),0.6)' }}>Football Squares</p>
          <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none" style={{ color: 'var(--sq-text)' }}>Sign In</h1>
        </div>

        <form onSubmit={handleSignIn} className="space-y-3">
          <input
            type="email"
            required
            placeholder="Email"
            aria-label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
          />
          <input
            type="password"
            required
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full font-mono text-sm px-4 py-3 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            style={{ background: 'rgba(var(--sq-alpha),0.05)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'var(--sq-text)' }}
          />
          <div className="flex justify-end">
            <button type="button" onClick={() => switchMode('forgot')} className="font-mono text-[10px] tracking-widest uppercase" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--sq-accent-rgb),0.5)', padding: 0 }}>
              Forgot password?
            </button>
          </div>
          {error && <p className="font-mono text-xs text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className="w-full font-display font-bold text-sm tracking-[0.2em] uppercase py-3 rounded-sm transition-all disabled:opacity-50" style={{ background: '#f59e0b', color: '#07070e' }}>
            {loading ? 'Please wait…' : 'Sign In'}
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(var(--sq-alpha),0.08)' }} />
          <span className="font-mono text-[10px] tracking-widest uppercase text-gray-500">or</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(var(--sq-alpha),0.08)' }} />
        </div>

        <button onClick={handleGoogle} className="w-full flex items-center justify-center gap-3 font-display font-semibold text-sm tracking-wider uppercase py-3 rounded-sm transition-all" style={{ background: 'rgba(var(--sq-alpha),0.04)', border: '1px solid rgba(var(--sq-alpha),0.1)', color: 'var(--sq-text)' }}>
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="font-mono text-xs text-center text-gray-500">
          Don't have an account?{' '}
          <button onClick={() => switchMode('register')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(var(--sq-accent-rgb),0.7)', padding: 0 }} className="font-mono text-xs">
            Create one
          </button>
        </p>
      </div>
    </Shell>
  )
}

function Shell({ children }) {
  return (
    <div className="min-h-screen dot-grid flex items-center justify-center px-5" style={{ background: 'var(--sq-bg)' }}>
      <div className="w-full max-w-sm animate-slide-up">
        <div className="rounded-sm p-8" style={{ background: 'var(--sq-surface)', border: '1px solid rgba(var(--sq-accent-rgb),0.15)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
