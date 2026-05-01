import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import SquaresGrid from '../components/SquaresGrid'
import WinnerBanner from '../components/WinnerBanner'
import PaymentMethod from '../components/PaymentMethod'
import FloatingMenu from '../components/FloatingMenu'
import PayoutStrip from '../components/PayoutStrip'
import JoinCodePill from '../components/JoinCodePill'
import ThemeToggle from '../components/ThemeToggle'
import { WinnerList } from './BoardView'

export default function PlayerView() {
  const { playerToken } = useParams()
  const { state: locationJoinInfo } = useLocation()
  const [boardId, setBoardId] = useState(null)
  const [board, setBoard] = useState(null)
  const [squares, setSquares] = useState([])
  const [admin, setAdmin] = useState(null)
  const [latestWinner, setLatestWinner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [winners, setWinners] = useState([])
  const [markingPending, setMarkingPending] = useState(false)
  const [claimingMore, setClaimingMore] = useState(false)
  const [claiming, setClaiming] = useState(false)
  const [randomCount, setRandomCount] = useState('1')
  const squaresRef = useRef([])

  // Persist joinInfo to localStorage so it survives a page refresh.
  // Location state (from React Router) is lost on reload; localStorage is not.
  useEffect(() => {
    if (locationJoinInfo) {
      localStorage.setItem(`joinInfo:${playerToken}`, JSON.stringify(locationJoinInfo))
    }
  }, [playerToken, locationJoinInfo])

  const joinInfo = useMemo(() => {
    if (locationJoinInfo) return locationJoinInfo
    try {
      const stored = localStorage.getItem(`joinInfo:${playerToken}`)
      return stored ? JSON.parse(stored) : null
    } catch { return null }
  }, [locationJoinInfo, playerToken])

  const winnerSquareIds = useMemo(() => new Set(winners.map((w) => w.square_id)), [winners])
  const mySquareIds = useMemo(
    () => new Set(squares.filter((s) => s.player_token === playerToken && s.owner_name).map((s) => s.id)),
    [squares, playerToken]
  )

  const playerUrl = window.location.href

  // Fetch data + subscribe to realtime in one effect.
  // Channel is created before the parallel fetch so no updates are missed.
  useEffect(() => {
    let channel = null
    let cancelled = false

    async function init() {
      const { data: mine, error: mErr } = await supabase
        .from('squares')
        .select('*')
        .eq('player_token', playerToken)

      if (cancelled) return

      const owned = mine?.filter((s) => s.owner_name) ?? []
      const id = owned[0]?.board_id ?? joinInfo?.boardId

      if (mErr || !id) {
        setError('No squares found for this link.')
        setLoading(false)
        return
      }

      // Subscribe before parallel fetch to close the missed-update window
      channel = supabase
        .channel(`board-${id}`)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'squares', filter: `board_id=eq.${id}` },
          (payload) => {
            setSquares((prev) => {
              const next = prev.map((sq) => sq.id === payload.new.id ? payload.new : sq)
              squaresRef.current = next
              return next
            })
          }
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boards', filter: `id=eq.${id}` },
          (payload) => setBoard(payload.new)
        )
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'winners', filter: `board_id=eq.${id}` },
          (payload) => setWinners((prev) => [...prev.filter((w) => w.moment !== payload.new.moment || w.is_reverse !== payload.new.is_reverse), payload.new])
        )
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'winners', filter: `board_id=eq.${id}` },
          (payload) => setWinners((prev) => prev.map((w) => w.id === payload.new.id ? payload.new : w))
        )
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'winners', filter: `board_id=eq.${id}` },
          (payload) => setWinners((prev) => prev.filter((w) => w.id !== payload.old.id))
        )
        .on('broadcast', { event: 'winner' }, ({ payload }) => {
          setLatestWinner(payload)
        })
        .subscribe()

      const [{ data: boardData, error: bErr }, { data: allSquares, error: sErr }, { data: adminData }, { data: winnersData }] = await Promise.all([
        supabase.from('boards').select('*').eq('id', id).single(),
        supabase.from('squares').select('*').eq('board_id', id),
        supabase.from('board_admins').select('cashapp_handle, venmo_handle').eq('board_id', id).limit(1).single(),
        supabase.from('winners').select('*').eq('board_id', id),
      ])

      if (bErr || sErr) { setError(friendlyError(bErr || sErr, 'load')); setLoading(false); return }
      setBoard(boardData)
      setSquares(allSquares)
      squaresRef.current = allSquares
      setAdmin(adminData)
      setWinners(winnersData ?? [])
      setLoading(false)
      setBoardId(id)
      if (owned.length === 0 && boardData.status === 'open') setClaimingMore(true)
    }

    init()
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel) }
  }, [playerToken])

  const isOpen = board?.status === 'open'

  useEffect(() => {
    if (!isOpen && claimingMore) setClaimingMore(false)
  }, [isOpen, claimingMore])

  if (loading) return (
    <div className="min-h-screen dot-grid flex items-center justify-center" style={{ background: 'var(--sq-bg)' }}>
      <p className="font-display text-amber-400 text-xl tracking-widest animate-pulse">LOADING…</p>
    </div>
  )
  if (error) return (
    <div className="min-h-screen dot-grid flex items-center justify-center p-6" style={{ background: 'var(--sq-bg)' }}>
      <p className="font-mono text-red-400 text-sm text-center">{error}</p>
    </div>
  )

  // Derive mySquares from squares so it's always in sync with realtime updates.
  const mySquares = squares.filter((s) => s.player_token === playerToken && s.owner_name)
  const playerName = mySquares[0]?.owner_name ?? joinInfo?.name ?? 'Player'
  const paidCount = mySquares.filter((s) => s.is_paid).length
  const pendingCount = mySquares.filter((s) => s.payment_pending && !s.is_paid).length
  const unpaidCount = mySquares.filter((s) => !s.is_paid && !s.payment_pending).length
  const amountOwed = (unpaidCount + pendingCount) * (board.price_per_square ?? 0)
  const isLocked = board.status === 'locked' || board.status === 'complete'

  async function markPaymentSent() {
    setMarkingPending(true)
    const toMark = mySquares.filter((s) => !s.is_paid && !s.payment_pending)
    for (const sq of toMark) {
      const { data, error } = await supabase.from('squares').update({ payment_pending: true }).eq('id', sq.id).select().single()
      if (!error && data) {
        setSquares((prev) => prev.map((s) => s.id === data.id ? data : s))
      }
    }
    setMarkingPending(false)
  }

  async function undoPending() {
    setMarkingPending(true)
    const toUndo = mySquares.filter((s) => s.payment_pending && !s.is_paid)
    for (const sq of toUndo) {
      const { data, error } = await supabase.from('squares').update({ payment_pending: false }).eq('id', sq.id).select().single()
      if (!error && data) {
        setSquares((prev) => prev.map((s) => s.id === data.id ? data : s))
      }
    }
    setMarkingPending(false)
  }

  async function claimSquare(sq) {
    if (sq.owner_name) return
    const p = mySquares[0]
    const info = {
      owner_name:     p?.owner_name     ?? joinInfo?.name,
      display_name:   p?.display_name   ?? joinInfo?.displayName ?? null,
      owner_email:    p?.owner_email    ?? joinInfo?.email,
      owner_phone:    p?.owner_phone    ?? joinInfo?.phone,
      cashapp_handle: p?.cashapp_handle ?? joinInfo?.cashappHandle ?? null,
      venmo_handle:   p?.venmo_handle   ?? joinInfo?.venmoHandle ?? null,
    }
    setClaiming(true)
    const { data, error: err } = await supabase
      .from('squares')
      .update({
        owner_name:     info.owner_name,
        display_name:   info.display_name,
        owner_email:    info.owner_email,
        owner_phone:    info.owner_phone,
        cashapp_handle: info.cashapp_handle,
        venmo_handle:   info.venmo_handle,
        claimed_at:     new Date().toISOString(),
        player_token:   playerToken,
      })
      .eq('id', sq.id)
      .is('owner_name', null)
      .select()
      .single()
    if (!err && data) {
      const next = squaresRef.current.map((s) => s.id === data.id ? data : s)
      setSquares(next)
      squaresRef.current = next
    }
    setClaiming(false)
  }

  async function claimRandom() {
    const n = Math.min(Math.max(1, parseInt(randomCount) || 1),
      squaresRef.current.filter((s) => !s.owner_name).length)
    if (n === 0) return
    const p = mySquares[0]
    const info = {
      owner_name:     p?.owner_name     ?? joinInfo?.name,
      display_name:   p?.display_name   ?? joinInfo?.displayName ?? null,
      owner_email:    p?.owner_email    ?? joinInfo?.email,
      owner_phone:    p?.owner_phone    ?? joinInfo?.phone,
      cashapp_handle: p?.cashapp_handle ?? joinInfo?.cashappHandle ?? null,
      venmo_handle:   p?.venmo_handle   ?? joinInfo?.venmoHandle ?? null,
    }
    setClaiming(true)
    const skipped = new Set()
    let claimed = 0
    while (claimed < n) {
      const pool = squaresRef.current.filter((s) => !s.owner_name && !skipped.has(s.id))
      if (pool.length === 0) break
      const pick = pool[Math.floor(Math.random() * pool.length)]
      const { data, error: err } = await supabase
        .from('squares')
        .update({
          owner_name:     info.owner_name,
          display_name:   info.display_name,
          owner_email:    info.owner_email,
          owner_phone:    info.owner_phone,
          cashapp_handle: info.cashapp_handle,
          venmo_handle:   info.venmo_handle,
          claimed_at:     new Date().toISOString(),
          player_token:   playerToken,
        })
        .eq('id', pick.id)
        .is('owner_name', null)
        .select()
        .single()
      if (!err && data) {
        claimed++
        const next = squaresRef.current.map((s) => s.id === data.id ? data : s)
        setSquares(next)
        squaresRef.current = next
      } else {
        skipped.add(pick.id)
      }
    }
    setClaiming(false)
  }

  async function unclaimSquare(sq) {
    if (sq.is_paid) return
    const { data, error } = await supabase
      .from('squares')
      .update({ owner_name: null, owner_email: null, owner_phone: null, claimed_at: null, player_token: crypto.randomUUID() })
      .eq('id', sq.id)
      .eq('is_paid', false)
      .select()
      .single()
    if (!error && data) {
      setSquares((prev) => prev.map((s) => s.id === data.id ? data : s))
    }
  }

  return (
    <>
      <div className="min-h-screen dot-grid text-white" style={{ background: 'var(--sq-bg)', paddingTop: 'env(safe-area-inset-top)' }}>

        {/* ── HEADER ─────────────────────────────────── */}
        <div className="animate-slide-up" style={{ borderBottom: '1px solid rgba(var(--sq-accent-rgb),0.2)', background: 'linear-gradient(180deg, var(--sq-bg-raised) 0%, var(--sq-bg) 100%)' }}>
          <div className="max-w-2xl mx-auto px-5 pt-6 pb-5">
            {/* Top row: label + board name / QR code */}
            <div className="flex items-start gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[10px] tracking-[0.25em] text-amber-500/60 uppercase">{playerName}'s Squares</span>
                <h1 className="font-display text-3xl font-bold uppercase tracking-wide leading-none text-white mt-1">
                  {board.name}
                </h1>
              </div>
              {/* QR code */}
              <div className="flex-shrink-0 flex items-start gap-2">
                <ThemeToggle inline />
                <div className="p-1.5 rounded-sm" style={{ background: '#ffffff' }}>
                  <QRCodeCanvas value={playerUrl} size={54} bgColor="#ffffff" fgColor="#000000" />
                </div>
              </div>
            </div>

            {/* Teams line — full width, sits below QR on narrow screens */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.away_team}</span>
                <span style={{ color: 'var(--sq-accent)', fontSize: '10px' }}>◆</span>
                <span className="font-display text-sm font-semibold tracking-wider text-gray-300 uppercase">{board.home_team}</span>
              </div>
              {board.join_code && board.status === 'open' && <JoinCodePill code={board.join_code} />}
            </div>

            <PayoutStrip board={board} />

            {/* Stats strip */}
            <div className="mt-3 grid grid-cols-4 gap-px rounded-sm overflow-hidden" style={{ background: 'rgba(var(--sq-accent-rgb),0.1)' }}>
              <MiniStat label="Squares" value={mySquares.length} />
              <MiniStat label="Paid" value={paidCount} accent={paidCount === mySquares.length && mySquares.length > 0} />
              <MiniStat label="Pending" value={pendingCount} pending={pendingCount > 0} />
              <MiniStat label="Owed" value={amountOwed > 0 ? `$${amountOwed}` : '—'} warn={unpaidCount > 0} />
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 py-6 pb-28 space-y-5">

          {/* ── CLAIM MORE BUTTON ────────────────────── */}
          {isOpen && !claimingMore && (
            <div className="sticky top-0 z-10">
              <button
                onClick={() => setClaimingMore(true)}
                className="w-full font-display text-sm font-bold tracking-[0.2em] uppercase py-3 rounded-sm transition-all"
                style={{ background: 'rgba(var(--sq-accent-rgb),0.1)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.25)' }}
              >
                + Claim More Squares
              </button>
            </div>
          )}

          {/* ── GRID ─────────────────────────────────── */}
          {claimingMore && (
            <div className="sticky top-0 z-10 rounded-sm"
              style={{ background: 'var(--sq-surface)', border: '1px solid rgba(var(--sq-accent-rgb),0.2)' }}>
              {/* Top row: title + done */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                <div>
                  <p className="font-display text-sm font-semibold uppercase tracking-wide text-white leading-none">Pick Squares</p>
                  <p className="font-mono text-[10px] text-gray-400 mt-0.5 tracking-wider">
                    {squares.filter((s) => !s.owner_name).length} open · ${board.price_per_square}/sq
                  </p>
                </div>
                <button
                  onClick={() => { setClaimingMore(false); setClaiming(false) }}
                  className="font-display text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-sm"
                  style={{ background: '#f59e0b', color: '#07070e', cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
              {/* Bottom row: random picker */}
              <div className="px-4 pb-3 flex gap-2 items-center" style={{ borderTop: '1px solid rgba(var(--sq-alpha),0.06)' }}>
                <span className="font-mono text-[10px] text-gray-500 tracking-wider uppercase">Random:</span>
                <input
                  type="number" min="1" max={squares.filter((s) => !s.owner_name).length}
                  aria-label="Number of squares to claim"
                  value={randomCount}
                  onChange={(e) => setRandomCount(e.target.value)}
                  className="font-mono text-sm text-white text-center w-14 py-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
                  style={{ background: 'rgba(var(--sq-alpha),0.06)', border: '1px solid rgba(var(--sq-alpha),0.1)' }}
                />
                <button
                  onClick={claimRandom}
                  disabled={claiming || squares.filter((s) => !s.owner_name).length === 0}
                  className="flex-1 font-display text-xs font-bold tracking-widest uppercase py-1.5 rounded-sm transition-all disabled:opacity-40"
                  style={{ background: 'rgba(var(--sq-accent-rgb),0.12)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.2)', cursor: 'pointer' }}
                >
                  {claiming ? 'Claiming…' : 'Assign Me Squares'}
                </button>
              </div>
            </div>
          )}

          <SquaresGrid
            squares={squares}
            homeTeam={board.home_team}
            awayTeam={board.away_team}
            mySquareIds={mySquareIds}
            winnerSquareIds={winnerSquareIds}
            rowNumbers={board.row_numbers}
            colNumbers={board.col_numbers}
            rotateNumbers={board.rotate_numbers}
            rotatedRowNumbers={board.row_numbers_rotated}
            rotatedColNumbers={board.col_numbers_rotated}
            scoringMoments={board.scoring_moments}
            onClaim={claimingMore && !claiming ? claimSquare : null}
            onUnclaim={isOpen ? unclaimSquare : null}
          />

          {isOpen && (claimingMore || unpaidCount > 0) && (
            <p className="font-mono text-[10px] text-gray-400 text-center mt-2 tracking-wider">
              {claimingMore
                ? 'Tap any open square to claim it'
                : 'Tap your square to unclaim it (unpaid only)'}
            </p>
          )}

          {/* ── WINNERS ──────────────────────────────── */}
          {winners.length > 0 && (
            <WinnerList winners={winners} squares={squares} scoringMoments={board.scoring_moments} board={board} />
          )}

          {/* ── PAYMENT CARD ─────────────────────────── */}
          {(unpaidCount > 0 || pendingCount > 0) && (
            <div className="animate-slide-up-2 rounded-sm overflow-hidden" style={{ background: 'var(--sq-surface)', border: `1px solid ${pendingCount > 0 && unpaidCount === 0 ? 'rgba(234,179,8,0.25)' : 'rgba(var(--sq-accent-rgb),0.15)'}` }}>

              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.06)', background: pendingCount > 0 && unpaidCount === 0 ? 'rgba(234,179,8,0.05)' : 'rgba(var(--sq-accent-rgb),0.04)' }}>
                <div className="flex items-center gap-2">
                  {pendingCount > 0 && unpaidCount === 0
                    ? <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse-dot" />
                    : <span className="w-0.5 h-3 rounded-full" style={{ background: 'var(--sq-accent)' }} />
                  }
                  <span className="font-display text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: pendingCount > 0 && unpaidCount === 0 ? 'rgba(250,204,21,0.8)' : 'rgba(var(--sq-accent-rgb),0.8)' }}>
                    {pendingCount > 0 && unpaidCount === 0 ? 'Awaiting Confirmation' : 'Pay for Your Squares'}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-gray-400">
                  {unpaidCount > 0 ? `$${amountOwed} due` : `${pendingCount} pending`}
                </span>
              </div>

              {/* Pending section — shown when some squares are pending */}
              {pendingCount > 0 && (
                <div className="px-4 py-3 space-y-3" style={{ borderBottom: unpaidCount > 0 ? '1px solid rgba(var(--sq-alpha),0.06)' : undefined }}>
                  <p className="font-mono text-[10px] text-gray-400 tracking-wider">
                    {pendingCount} square{pendingCount !== 1 ? 's' : ''} marked as sent — the admin will confirm your payment.
                  </p>
                  <button
                    onClick={undoPending}
                    disabled={markingPending}
                    className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                    style={{ background: 'rgba(234,179,8,0.08)', color: '#facc15', border: '1px solid rgba(234,179,8,0.2)' }}
                  >
                    {markingPending ? 'Updating…' : 'Undo — payment not sent'}
                  </button>
                </div>
              )}

              {/* Unpaid section — shown when squares still need payment */}
              {unpaidCount > 0 && (
                <div className="px-4 py-3 space-y-3">
                  {/* Payment links */}
                  {(admin?.cashapp_handle || admin?.venmo_handle) && (
                    <div className="space-y-2">
                      <p className="font-mono text-[10px] text-gray-400 tracking-wider">
                        {unpaidCount} square{unpaidCount !== 1 ? 's' : ''} · ${unpaidCount * (board.price_per_square ?? 0)} due
                      </p>
                      {admin.cashapp_handle && (
                        <PaymentMethod
                          platform="cashapp"
                          handle={admin.cashapp_handle}
                          amount={unpaidCount * (board.price_per_square ?? 0)}
                          note={`${board.name} — ${playerName} (${unpaidCount} sq)`}
                        />
                      )}
                      {admin.venmo_handle && (
                        <PaymentMethod
                          platform="venmo"
                          handle={admin.venmo_handle}
                          amount={unpaidCount * (board.price_per_square ?? 0)}
                          note={`${board.name} — ${playerName} (${unpaidCount} sq)`}
                        />
                      )}
                      <div style={{ borderTop: '1px solid rgba(var(--sq-alpha),0.06)', paddingTop: '12px' }} />
                    </div>
                  )}
                  {/* Mark sent CTA */}
                  <button
                    onClick={markPaymentSent}
                    disabled={markingPending}
                    className="w-full font-display text-sm font-bold tracking-[0.2em] uppercase py-3 rounded-sm transition-all disabled:opacity-50"
                    style={{ background: '#f59e0b', color: '#07070e' }}
                  >
                    {markingPending ? 'Updating…' : `I've sent $${unpaidCount * (board.price_per_square ?? 0)}`}
                  </button>
                  <p className="font-mono text-[9px] text-gray-400 text-center tracking-wider">
                    Tap after sending payment — the admin will confirm
                  </p>
                </div>
              )}
            </div>
          )}



        </div>
      </div>

      <FloatingMenu boardId={boardId} isLocked={isLocked} />
      <WinnerBanner winner={latestWinner} />
    </>
  )
}


function MiniStat({ label, value, accent, warn, pending }) {
  return (
    <div className="px-3 py-3" style={{ background: 'var(--sq-surface)' }}>
      <p className="font-mono text-[9px] tracking-[0.18em] text-gray-400 uppercase mb-1">{label}</p>
      <p className={`font-display text-xl font-semibold leading-none ${accent ? 'text-emerald-400' : warn ? 'text-red-400' : pending ? 'text-yellow-400' : 'text-white'}`}>
        {value}
      </p>
    </div>
  )
}

