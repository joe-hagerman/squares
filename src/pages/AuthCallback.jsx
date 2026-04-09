import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/reset-password', { replace: true })
        subscription.unsubscribe()
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        const redirect = sessionStorage.getItem('auth_redirect') ?? '/'
        sessionStorage.removeItem('auth_redirect')
        navigate(session ? redirect : '/login', { replace: true })
        subscription.unsubscribe()
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <div className="min-h-screen dot-grid flex items-center justify-center" style={{ background: 'var(--sq-bg)' }}>
      <p className="font-display text-amber-400 text-2xl tracking-widest uppercase animate-pulse">Signing in…</p>
    </div>
  )
}
