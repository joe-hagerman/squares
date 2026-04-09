import { useEffect, useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { lockBoard } from '../lib/board'
import LockIcon from '../components/LockIcon'
import SquaresGrid from '../components/SquaresGrid'
import PaymentTracker from '../components/PaymentTracker'
import ScoreEntry from '../components/ScoreEntry'
import PayoutGroup from '../components/PayoutGroup'
import WinnerBanner from '../components/WinnerBanner'
import FloatingMenu from '../components/FloatingMenu'

export default function AdminDashboard() {
  const { boardId } = useParams()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [board, setBoard] = useState(null)
  const [squares, setSquares] = useState([])
  const [scoreUpdates, setScoreUpdates] = useState([])
  const [winners, setWinners] = useState([])
  const [latestWinner, setLatestWinner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('payments')
  const channelRef = useRef(null)

  useEffect(() => {
    async function init() {
      const [{ data: boardData, error: bErr }, { data: squaresData, error: sErr }, { data: scoresData }, { data: winnersData }] = await Promise.all([
        supabase.from('boards').select('*').eq('id', boardId).single(),
        supabase.from('squares').select('*').eq('board_id', boardId),
        supabase.from('score_updates').select('*').eq('board_id', boardId),
        supabase.from('winners').select('*').eq('board_id', boardId),
      ])
      if (bErr || sErr) { setError((bErr || sErr).message); setLoading(false); return }
      if (boardData.user_id !== null && boardData.user_id !== user?.id) {
        setError('Access denied — this board belongs to a different account.')
        setLoading(false)
        return
      }
      setBoard(boardData)
      setSquares(squaresData)
      setScoreUpdates(scoresData ?? [])
      setWinners(winnersData ?? [])
      setLoading(false)
    }
    init()

    channelRef.current = supabase
      .channel(`board-${boardId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'squares', filter: `board_id=eq.${boardId}` },
        (payload) => setSquares((prev) => prev.map((sq) => sq.id === payload.new.id ? payload.new : sq))
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boards', filter: `id=eq.${boardId}` },
        (payload) => setBoard(payload.new)
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'score_updates', filter: `board_id=eq.${boardId}` },
        (payload) => setScoreUpdates((prev) => [...prev, payload.new])
      )
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winners', filter: `board_id=eq.${boardId}` },
        (payload) => setWinners((prev) => [...prev.filter((w) => w.moment !== payload.new.moment), payload.new])
      )
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'winners', filter: `board_id=eq.${boardId}` },
        (payload) => setWinners((prev) => prev.map((w) => w.id === payload.new.id ? payload.new : w))
      )
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'winners', filter: `board_id=eq.${boardId}` },
        (payload) => setWinners((prev) => prev.filter((w) => w.id !== payload.old.id))
      )
      .subscribe()

    return () => { supabase.removeChannel(channelRef.current) }
  }, [boardId])

  // Scroll to top on mount — React Router preserves scroll position across navigation.
  useEffect(() => { window.scrollTo(0, 0) }, [])

  // Lock the board once all 100 squares are claimed and paid.
  // Must live in a useEffect — state updater callbacks don't run synchronously,
  // so reading a flag set inside setSquares(fn) immediately after is unreliable.
  useEffect(() => {
    if (!board || board.status !== 'open' || squares.length !== 100) return
    if (squares.every((s) => s.owner_name && s.is_paid)) {
      lockBoard(boardId, { rotateNumbers: board.rotate_numbers, scoringMoments: board.scoring_moments })
    }
  }, [squares, board, boardId])

  if (loading) return (
    <div className="min-h-screen dot-grid flex items-center justify-center" style={{ background: 'var(--sq-bg)' }}>
      <p className="font-display text-amber-400 text-2xl tracking-widest uppercase animate-pulse">Loading…</p>
    </div>
  )
  if (error) return (
    <div className="min-h-screen dot-grid flex items-center justify-center" style={{ background: 'var(--sq-bg)' }}>
      <p className="text-red-400">{error}</p>
    </div>
  )

  const claimed = squares.filter((s) => s.owner_name).length
  const paidCount = squares.filter((s) => s.is_paid).length
  const unpaidOwned = squares.filter((s) => s.owner_name && !s.is_paid).length
  const isOpen = board.status === 'open'
  const isLocked = board.status === 'locked' || board.status === 'complete'
  const claimedPct = claimed

  const STATUS_CONFIG = {
    open:     { label: 'OPEN',     dot: 'bg-emerald-400', text: 'text-emerald-400', border: 'border-emerald-400/30' },
    locked:   { label: 'LOCKED',   dot: 'bg-amber-400',   text: 'text-amber-400',   border: 'border-amber-400/30' },
    complete: { label: 'COMPLETE', dot: 'bg-gray-400',    text: 'text-gray-400',    border: 'border-gray-400/30' },
  }
  const statusCfg = STATUS_CONFIG[board.status] ?? STATUS_CONFIG.complete

  const unpaidWinners = winners.filter((w) => !w.payout_sent && w.payout)
  const scoredMoments = new Set(scoreUpdates.map((s) => s.moment))
  const allMomentsScored = board.scoring_moments.every((m) => scoredMoments.has(m))

  const tabs = [
    { key: 'payments', label: 'BOARD', badge: unpaidOwned > 0 ? unpaidOwned : null },
    { key: 'gameday',  label: 'GAME DAY',
      locked: !isLocked,
      lockMessage: 'All squares must be claimed and paid before scores can be entered.' },
    { key: 'payouts',  label: 'PAYOUTS', badge: unpaidWinners.length > 0 ? unpaidWinners.length : null,
      locked: !allMomentsScored,
      lockMessage: 'All Game Day scores must be entered before payouts can be issued.' },
  ]

  return (
    <div className="min-h-screen dot-grid text-white" style={{ background: 'var(--sq-bg)', fontFamily: 'inherit' }}>

      {/* ── HERO HEADER ───────────────────────────────── */}
      <div className="animate-slide-up" style={{ borderBottom: '1px solid rgba(var(--sq-accent-rgb),0.2)', background: 'linear-gradient(180deg, var(--sq-bg-raised) 0%, var(--sq-bg) 100%)' }}>
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-5">

          {/* Top row: label + board name / status badge */}
          <div className="flex items-start gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[10px] tracking-[0.2em] text-amber-500/60 uppercase">Admin Dashboard</span>
              <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none mt-1" style={{ color: 'var(--sq-text)' }}>
                {board.name}
              </h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm border ${statusCfg.border}`} style={{ background: 'rgba(0,0,0,0.4)' }}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot} ${isOpen ? 'animate-pulse-dot' : ''}`} />
                <span className={`font-mono text-[10px] tracking-widest font-medium ${statusCfg.text}`}>{statusCfg.label}</span>
              </div>
              <button
                onClick={async () => { await signOut(); navigate('/') }}
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm transition-colors"
                style={{ color: 'rgba(var(--sq-alpha),0.55)', border: '1px solid rgba(var(--sq-alpha),0.2)' }}
              >
                Sign out
              </button>
            </div>
          </div>

          {/* Teams line */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
              <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
              <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
            </div>
            {board.join_code && <JoinCodePill code={board.join_code} />}
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-sm" style={{ background: 'rgba(var(--sq-accent-rgb),0.1)' }}>
            <StatCell label="Per Square" value={`$${board.price_per_square}`} />
            <StatCell label="Claimed" value={`${claimed}/100`} accent={claimed === 100} />
            <StatCell label="Scoring" value={board.scoring_moments.join(' · ')} small />
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--sq-alpha),0.07)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${claimedPct}%`, background: claimed === 100 ? '#10b981' : '#f59e0b' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-[10px] text-gray-400">{claimed} claimed · {paidCount} paid</span>
            <span className="font-mono text-[10px] text-gray-400">{100 - claimed} open</span>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-6 pb-28 space-y-5">

        {/* ── TABS ─────────────────────────────────────── */}
        <div className="animate-slide-up-2 flex" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.07)' }}>
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={t.locked ? undefined : () => setTab(t.key)}
              className={`relative flex items-center gap-2 px-4 pb-3 pt-1 transition-colors ${t.locked ? 'group/lock cursor-not-allowed' : 'cursor-pointer'}`}
              style={{ color: tab === t.key ? '#f59e0b' : t.locked ? 'rgba(var(--sq-alpha),0.2)' : 'rgba(var(--sq-alpha),0.35)' }}
            >
              <span className="font-display text-sm font-semibold tracking-wider">{t.label}</span>
              {t.badge && !t.locked && (
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                  style={{ background: '#dc2626', color: '#fff' }}>
                  {t.badge}
                </span>
              )}
              {tab === t.key && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ background: 'var(--sq-accent)' }} />
              )}
              {t.locked && (
                <>
                  <LockIcon style={{ opacity: 0.75, flexShrink: 0 }} />
                  <span className="pointer-events-none absolute bottom-full left-0 mb-2 w-48 rounded-sm px-2.5 py-2 font-mono text-[10px] leading-relaxed opacity-0 group-hover/lock:opacity-100 group-focus/lock:opacity-100 transition-opacity z-50 whitespace-normal"
                    style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.7)' }}>
                    {t.lockMessage}
                  </span>
                </>
              )}
            </button>
          ))}
        </div>

        {/* ── TAB CONTENT ──────────────────────────────── */}
        <div className="animate-slide-up-3">
          {tab === 'payments' && (
            <div className="space-y-4">
              <SquaresGrid
                squares={squares}
                homeTeam={board.home_team}
                awayTeam={board.away_team}
                rowNumbers={board.row_numbers}
                colNumbers={board.col_numbers}
                rotateNumbers={board.rotate_numbers}
                rotatedRowNumbers={board.row_numbers_rotated}
                rotatedColNumbers={board.col_numbers_rotated}
                scoringMoments={board.scoring_moments}
                winnerSquareIds={new Set(winners.map((w) => w.square_id))}
                mode="payment"
              />
              <PaymentTracker
                squares={squares}
                pricePerSquare={board.price_per_square}
                isLocked={isLocked}
                onSquareUpdated={(updated) => {
                  setSquares((prev) => prev.map((s) => s.id === updated.id ? updated : s))
                }}
              />
            </div>
          )}

          {tab === 'gameday' && (
            <ScoreEntry
              board={board}
              squares={squares}
              scoreUpdates={scoreUpdates}
              winners={winners}
              channel={channelRef.current}
              readOnly={winners.some((w) => w.payout_sent)}
              onScoreSubmitted={(newWinner) => {
                if (newWinner) setLatestWinner(newWinner)
              }}
            />
          )}

          {tab === 'payouts' && (() => {
            if (winners.length === 0) return (
              <p className="font-mono text-xs text-gray-400 text-center py-8 tracking-wider">No winners recorded.</p>
            )

            // Group winners by player_token (same person may own multiple winning squares)
            const groups = {}
            for (const w of winners) {
              const sq = squares.find((s) => s.id === w.square_id)
              if (!sq) continue
              const key = sq.player_token ?? sq.owner_name
              if (!groups[key]) groups[key] = { square: sq, wins: [] }
              groups[key].wins.push(w)
            }
            // Sort by total payout descending
            const sorted = Object.values(groups).sort((a, b) =>
              b.wins.reduce((s, w) => s + (w.payout ?? 0), 0) - a.wins.reduce((s, w) => s + (w.payout ?? 0), 0)
            )
            return (
              <div className="space-y-4">
                {sorted.map(({ square, wins }) => (
                  <PayoutGroup key={square.player_token ?? square.owner_name} square={square} wins={wins} board={board} />
                ))}
              </div>
            )
          })()}
        </div>




      </div>

      <FloatingMenu boardId={boardId} isLocked={isLocked} />
      <WinnerBanner winner={latestWinner} />
    </div>
  )
}

function StatCell({ label, value, accent, small }) {
  return (
    <div className="px-3 py-3" style={{ background: 'var(--sq-surface)' }}>
      <p className="font-mono text-[9px] tracking-[0.18em] text-gray-400 uppercase mb-1">{label}</p>
      <p className={`font-display font-semibold leading-none ${small ? 'text-sm' : 'text-xl'} ${accent ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

function JoinCodePill({ code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <button
      onClick={handleCopy}
      title="Click to copy join code"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        letterSpacing: '0.22em',
        color: copied ? '#10b981' : 'var(--sq-accent)',
        background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(var(--sq-accent-rgb),0.08)',
        border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-accent-rgb),0.2)'}`,
        padding: '3px 10px',
        borderRadius: '2px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
      }}
    >
      <span style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.15em' }}>JOIN</span>
      <span>{copied ? 'COPIED' : code}</span>
    </button>
  )
}


