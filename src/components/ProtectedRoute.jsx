import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return (
    <div className="min-h-screen dot-grid flex items-center justify-center" style={{ background: 'var(--sq-bg)' }}>
      <p className="font-display text-amber-400 text-2xl tracking-widest uppercase animate-pulse">Loading…</p>
    </div>
  )

  if (!session) return (
    <Navigate to="/login" state={{ from: location.pathname }} replace />
  )

  return children
}
