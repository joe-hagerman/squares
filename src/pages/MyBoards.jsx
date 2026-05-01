import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { useAuth } from '../context/AuthContext'

const STATUS_CONFIG = {
  open:     { label: 'Open',     color: 'text-emerald-400', dot: 'bg-emerald-400' },
  locked:   { label: 'Locked',   color: 'text-amber-400',   dot: 'bg-amber-400'   },
  complete: { label: 'Complete', color: 'text-gray-400',    dot: 'bg-gray-400'    },
}

export default function MyBoards() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [boards, setBoards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('boards')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(friendlyError(error, 'load'))
        else setBoards(data ?? [])
        setLoading(false)
      })
  }, [user.id])

  if (loading) return (
    <div className="min-h-screen dot-grid flex items-center justify-center" style={{ background: 'var(--sq-bg)' }}>
      <p className="font-display text-amber-400 text-2xl tracking-widest uppercase animate-pulse">Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen dot-grid text-white" style={{ background: 'var(--sq-bg)' }}>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(var(--sq-accent-rgb),0.15)', background: 'linear-gradient(180deg, var(--sq-bg-raised) 0%, var(--sq-bg) 100%)' }}>
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-5 flex items-center justify-between">
          <div>
            <span className="font-mono text-[10px] tracking-[0.2em] text-amber-500/60 uppercase">Football Squares</span>
            <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none mt-1" style={{ color: 'var(--sq-text)' }}>
              My Boards
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/create')}
              className="font-display text-xs font-bold tracking-wider uppercase px-4 py-2 rounded-sm transition-all"
              style={{ background: '#f59e0b', color: '#07070e' }}
            >
              + New Board
            </button>
            <button
              onClick={async () => { await signOut(); navigate('/') }}
              className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-2 rounded-sm"
              style={{ color: 'rgba(var(--sq-alpha),0.3)', border: '1px solid rgba(var(--sq-alpha),0.08)', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 space-y-3">

        {error && (
          <p className="font-mono text-xs text-red-400">{error}</p>
        )}

        {!error && boards.length === 0 && (
          <div className="text-center py-16 space-y-3">
            <p className="font-mono text-xs tracking-widest uppercase text-gray-500">No boards yet</p>
            <button
              onClick={() => navigate('/create')}
              className="font-display text-sm font-bold tracking-wider uppercase px-6 py-3 rounded-sm"
              style={{ background: 'rgba(var(--sq-accent-rgb),0.1)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.2)' }}
            >
              Create your first board
            </button>
          </div>
        )}

        {boards.map((board) => {
          const cfg = STATUS_CONFIG[board.status] ?? STATUS_CONFIG.complete
          return (
            <button
              key={board.id}
              onClick={() => navigate(`/board/${board.id}/admin`)}
              className="w-full text-left rounded-sm transition-all"
              style={{ background: 'var(--sq-surface)', border: '1px solid rgba(var(--sq-alpha),0.07)' }}
            >
              <div className="px-4 py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-display font-bold text-base tracking-wider uppercase leading-none truncate" style={{ color: 'var(--sq-text)' }}>
                    {board.name}
                  </p>
                  <p className="font-mono text-[10px] text-gray-400 mt-1 truncate">
                    {board.away_team} vs {board.home_team}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="font-mono text-[10px] text-gray-500">
                    ${board.price_per_square}/sq
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${board.status === 'open' ? 'animate-pulse-dot' : ''}`} />
                    <span className={`font-mono text-[10px] tracking-widest ${cfg.color}`}>{cfg.label}</span>
                  </div>
                  <span className="font-mono text-[10px] text-gray-600">›</span>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
