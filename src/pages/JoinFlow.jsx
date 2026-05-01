import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'

export default function JoinFlow() {
  const { boardId } = useParams()
  const navigate = useNavigate()

  const [board, setBoard] = useState(null)
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [cashappHandle, setCashappHandle] = useState('')
  const [venmoHandle, setVenmoHandle] = useState('')

  const [playerToken] = useState(() => {
    const key = `playerToken:${boardId}`
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const token = crypto.randomUUID()
    sessionStorage.setItem(key, token)
    return token
  })

  useEffect(() => {
    async function init() {
      const [{ data: boardData, error: bErr }, { data: adminData }] = await Promise.all([
        supabase.from('boards').select('*').eq('id', boardId).single(),
        supabase.from('board_admins').select('cashapp_handle, venmo_handle').eq('board_id', boardId).limit(1).single(),
      ])
      if (bErr) { setError(friendlyError(bErr, 'load')); setLoading(false); return }
      setBoard(boardData)
      setAdmin(adminData)
      setLoading(false)
    }
    init()
  }, [boardId])

  function handleInfoSubmit(e) {
    e.preventDefault()
    navigate(`/player/${playerToken}`, {
      state: {
        boardId,
        name: name.trim(),
        displayName: displayName.trim() || null,
        email: email.trim(),
        phone: phone.trim(),
        cashappHandle: cashappHandle.trim() || null,
        venmoHandle: venmoHandle.trim() || null,
      }
    })
  }

  if (loading) return (
    <Shell>
      <p className="font-display text-amber-400 text-xl tracking-widest animate-pulse">LOADING…</p>
    </Shell>
  )
  if (error) return (
    <Shell>
      <p className="font-mono text-red-400 text-sm">{error}</p>
    </Shell>
  )
  if (board?.status === 'locked' || board?.status === 'complete') return (
    <Shell>
      <div className="text-center space-y-3">
        <p className="font-display text-4xl font-bold tracking-widest text-amber-400">LOCKED</p>
        <p className="font-mono text-xs text-gray-400 tracking-wider">This board is locked — no more squares can be claimed.</p>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="w-full max-w-sm animate-slide-up">

        {/* Matchup header */}
        <div className="mb-8 text-center">
          <p className="font-mono text-[10px] tracking-[0.25em] text-amber-500/60 uppercase mb-3">Join the Pool</p>
          <h1 className="font-display text-3xl font-bold uppercase tracking-wide leading-tight text-white mb-2">
            {board.name}
          </h1>
          <div className="flex items-center justify-center gap-3">
            <span className="font-display text-base font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
            <span style={{ color: 'var(--sq-accent)', fontSize: '9px' }}>◆</span>
            <span className="font-display text-base font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
          </div>
          {board.price_per_square > 0 && (
            <div className="flex items-center justify-center mt-4">
              <Pill>${board.price_per_square} / sq</Pill>
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleInfoSubmit} className="space-y-3">
          <Field
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Field
            placeholder="Display name on squares (optional — falls back to initials)"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <Field
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Field
            type="tel"
            placeholder="Phone — optional, for winner notifications"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {admin?.cashapp_handle && (
            <Field
              placeholder="Cash App $cashtag (optional — for receiving winnings)"
              value={cashappHandle}
              onChange={(e) => setCashappHandle(e.target.value.replace(/^\$/, ''))}
            />
          )}
          {admin?.venmo_handle && (
            <Field
              placeholder="Venmo username (optional — for receiving winnings)"
              value={venmoHandle}
              onChange={(e) => setVenmoHandle(e.target.value.replace(/^@/, ''))}
            />
          )}
          <button
            type="submit"
            className="w-full font-display text-sm font-bold tracking-[0.2em] uppercase py-3.5 rounded-sm transition-all mt-1"
            style={{ background: '#f59e0b', color: '#07070e' }}
          >
            Pick My Squares →
          </button>
        </form>
      </div>
    </Shell>
  )
}

// ── SHARED COMPONENTS ──────────────────────────────────────────────
function Shell({ children }) {
  return (
    <div className="min-h-screen dot-grid text-white flex flex-col items-center justify-center p-6" style={{ background: 'var(--sq-bg)' }}>
      {children}
    </div>
  )
}

function Field({ type = 'text', placeholder, value, onChange, required }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      aria-label={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      className="w-full font-mono text-sm text-white placeholder-gray-600 px-4 py-3 rounded-sm outline-none transition-all"
      style={{
        background: 'var(--sq-surface)',
        border: '1px solid rgba(var(--sq-alpha),0.08)',
      }}
      onFocus={(e) => e.target.style.borderColor = 'rgba(var(--sq-accent-rgb),0.5)'}
      onBlur={(e) => e.target.style.borderColor = 'rgba(var(--sq-alpha),0.08)'}
    />
  )
}

function Pill({ children }) {
  return (
    <span className="font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-sm"
      style={{ background: 'rgba(var(--sq-accent-rgb),0.1)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.2)' }}>
      {children}
    </span>
  )
}
