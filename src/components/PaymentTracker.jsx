import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useReminder } from '../hooks/useReminder'

/**
 * PaymentTracker — shown on AdminDashboard payments tab.
 * Lists all claimed squares grouped by player.
 * Supports three states: unpaid → pending (player-initiated) → paid (admin-confirmed).
 */
export default function PaymentTracker({ squares, pricePerSquare, isLocked = false, onSquareUpdated }) {
  const claimed = squares.filter((s) => s.owner_name)

  const playerMap = {}
  for (const sq of claimed) {
    const key = sq.player_token ?? sq.owner_name
    if (!playerMap[key]) {
      playerMap[key] = { name: sq.owner_name, email: sq.owner_email, phone: sq.owner_phone, squares: [] }
    }
    playerMap[key].squares.push(sq)
  }
  // Sort: players with pending squares first, then unpaid, then fully paid
  const players = Object.values(playerMap).sort((a, b) => {
    const score = (p) => {
      if (p.squares.some((s) => s.payment_pending && !s.is_paid)) return 0
      if (p.squares.some((s) => !s.is_paid)) return 1
      return 2
    }
    return score(a) - score(b)
  })

  const totalOwed = claimed.length * pricePerSquare
  const totalPaid = claimed.filter((s) => s.is_paid).length * pricePerSquare
  const pendingCount = claimed.filter((s) => s.payment_pending && !s.is_paid).length
  const unpaidCount = claimed.filter((s) => !s.is_paid && !s.payment_pending).length

  const bulkReminder = useReminder()

  async function sendBulkReminder() {
    const ids = claimed.filter((s) => !s.is_paid && !s.payment_pending && s.owner_email).map((s) => s.id)
    await bulkReminder.send(ids, window.location.origin)
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-px rounded-sm overflow-hidden" style={{ background: 'rgba(var(--sq-accent-rgb),0.1)' }}>
        <Stat label="Collected" value={`$${totalPaid.toLocaleString()}`} color="text-emerald-400" />
        <Stat label="Pending" value={pendingCount} color="text-yellow-400" />
        <Stat label="Unpaid" value={unpaidCount} color="text-orange-400" />
        <Stat label="Outstanding" value={`$${(totalOwed - totalPaid).toLocaleString()}`} color="text-gray-400" />
      </div>

      {/* Bulk reminder bar */}
      {claimed.some((s) => !s.is_paid && !s.payment_pending && s.owner_email) && (
        <div className="flex items-center justify-between px-3 py-2 rounded-sm" style={{ background: 'rgba(var(--sq-accent-rgb),0.06)', border: '1px solid rgba(var(--sq-accent-rgb),0.12)' }}>
          <span className="font-mono text-[10px] tracking-[0.15em] text-gray-400 uppercase">Remind Unpaid</span>
          <div className="flex gap-2">
            <button
              onClick={sendBulkReminder}
              disabled={bulkReminder.sending || bulkReminder.sent || bulkReminder.error}
              className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all disabled:opacity-60"
              style={{ background: 'rgba(var(--sq-accent-rgb),0.12)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.25)' }}
            >
              {bulkReminder.sending ? 'Sending…' : bulkReminder.error ? 'Error ✕' : bulkReminder.sent ? 'Sent ✓' : '✉ Email'}
            </button>
            <div className="relative group/text">
              <button
                disabled
                className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm cursor-not-allowed"
                style={{ background: 'rgba(var(--sq-alpha),0.04)', color: 'rgba(var(--sq-alpha),0.2)', border: '1px solid rgba(var(--sq-alpha),0.08)' }}
              >
                💬 Text
              </button>
              <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2 py-1 rounded-sm font-mono text-[10px] opacity-0 group-hover/text:opacity-100 transition-opacity whitespace-nowrap z-50"
                style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.6)' }}>
                Coming soon
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar */}
      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(var(--sq-alpha),0.07)' }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: totalOwed > 0 ? `${(totalPaid / totalOwed) * 100}%` : '0%', background: '#10b981' }}
        />
      </div>

      {players.length === 0 ? (
        <p className="font-mono text-xs text-gray-400 text-center py-4 tracking-wider">No squares claimed yet.</p>
      ) : (
        <div className="space-y-2">
          {players.map((player) => (
            <PlayerRow
              key={player.squares[0]?.player_token ?? player.name}
              player={player}
              pricePerSquare={pricePerSquare}
              isLocked={isLocked}
              onSquareUpdated={onSquareUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div className="px-3 py-3" style={{ background: 'var(--sq-surface)' }}>
      <p className="font-mono text-[9px] tracking-[0.18em] text-gray-400 uppercase mb-1">{label}</p>
      <p className={`font-display text-xl font-semibold leading-none ${color}`}>{value}</p>
    </div>
  )
}

function PlayerRow({ player, pricePerSquare, isLocked, onSquareUpdated }) {
  const [expanded, setExpanded] = useState(false)
  const [toggling, setToggling] = useState(null)
  const [opError, setOpError] = useState(null)
  const reminder = useReminder()

  const paidCount = player.squares.filter((s) => s.is_paid).length
  const pendingCount = player.squares.filter((s) => s.payment_pending && !s.is_paid).length
  const unpaidCount = player.squares.filter((s) => !s.is_paid && !s.payment_pending).length
  const allPaid = paidCount === player.squares.length
  const hasPending = pendingCount > 0
  const total = player.squares.length * pricePerSquare
  const paid = paidCount * pricePerSquare

  async function sendPlayerReminder() {
    const ids = player.squares.filter((s) => !s.is_paid && !s.payment_pending).map((s) => s.id)
    await reminder.send(ids, window.location.origin)
  }

  async function confirmPending() {
    setToggling('pending')
    setOpError(null)
    const toConfirm = player.squares.filter((s) => s.payment_pending && !s.is_paid)
    const errors = []
    for (const sq of toConfirm) {
      const { data, error } = await supabase
        .from('squares')
        .update({ is_paid: true, payment_pending: false })
        .eq('id', sq.id)
        .select().single()
      if (error) errors.push(error.message)
      else if (data) onSquareUpdated(data)
    }
    if (errors.length) setOpError(`${errors.length} update(s) failed`)
    setToggling(null)
  }

  async function toggleSquare(sq) {
    setToggling(sq.id)
    setOpError(null)
    const newPaid = !sq.is_paid
    const { data, error } = await supabase
      .from('squares')
      .update({ is_paid: newPaid, payment_pending: false })
      .eq('id', sq.id)
      .select().single()
    if (error) setOpError(error.message)
    else if (data) onSquareUpdated(data)
    setToggling(null)
  }

  async function toggleAll() {
    const newVal = !allPaid
    setToggling('all')
    setOpError(null)
    const errors = []
    for (const sq of player.squares) {
      const { data, error } = await supabase
        .from('squares')
        .update({ is_paid: newVal, payment_pending: false })
        .eq('id', sq.id)
        .select().single()
      if (error) errors.push(error.message)
      else if (data) onSquareUpdated(data)
    }
    if (errors.length) setOpError(`${errors.length} update(s) failed`)
    setToggling(null)
  }

  async function unassignSquare(sq) {
    setToggling(sq.id)
    setOpError(null)
    const { data, error } = await supabase
      .from('squares')
      .update({ owner_name: null, owner_email: null, owner_phone: null, claimed_at: null, payment_pending: false, player_token: crypto.randomUUID() })
      .eq('id', sq.id)
      .eq('is_paid', false)
      .select().single()
    if (error) setOpError(error.message)
    else if (data) onSquareUpdated(data)
    setToggling(null)
  }

  const borderColor = hasPending
    ? 'rgba(234,179,8,0.3)'
    : allPaid
      ? 'rgba(16,185,129,0.2)'
      : 'rgba(var(--sq-alpha),0.06)'

  return (
    <div className="rounded-sm" style={{ background: 'var(--sq-surface)', border: `1px solid ${borderColor}` }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${allPaid ? 'bg-emerald-400' : hasPending ? 'bg-yellow-400 animate-pulse-dot' : 'bg-orange-500'}`} />
          <div className="min-w-0">
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sq-text)' }} className="truncate">{player.name}</p>
            <p className="font-mono text-[10px] text-gray-400 truncate">{player.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="font-mono text-xs text-gray-400">{player.squares.length} sq · ${paid}/${total}</span>
          {/* Reminder buttons — only for players with unpaid squares and an email */}
          {!allPaid && player.email && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); sendPlayerReminder() }}
                disabled={reminder.sending || reminder.sent || reminder.error}
                className="font-display text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded-sm transition-all disabled:opacity-60"
                style={{ background: 'rgba(var(--sq-accent-rgb),0.1)', color: 'var(--sq-accent)', border: '1px solid rgba(var(--sq-accent-rgb),0.2)' }}
              >
                {reminder.sending ? '…' : reminder.error ? '✕' : reminder.sent ? '✓' : '✉'}
              </button>
              <div className="relative group/textbtn">
                <button
                  disabled
                  className="font-display text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded-sm cursor-not-allowed"
                  style={{ background: 'rgba(var(--sq-alpha),0.04)', color: 'rgba(var(--sq-alpha),0.2)', border: '1px solid rgba(var(--sq-alpha),0.08)' }}
                >
                  💬
                </button>
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2 py-1 rounded-sm font-mono text-[10px] opacity-0 group-hover/textbtn:opacity-100 transition-opacity whitespace-nowrap z-50"
                  style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.6)' }}>
                  Coming soon
                </span>
              </div>
            </>
          )}
          {hasPending && (
            <button
              onClick={(e) => { e.stopPropagation(); confirmPending() }}
              disabled={toggling !== null}
              className="font-display text-xs font-bold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
              style={{ background: 'rgba(234,179,8,0.15)', color: '#facc15', border: '1px solid rgba(234,179,8,0.3)' }}
            >
              {toggling === 'pending' ? 'Confirming…' : `Confirm ${pendingCount > 1 ? `${pendingCount} ` : ''}Payment`}
            </button>
          )}
          {!hasPending && (
            allPaid && isLocked ? (
              <span className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm"
                style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}>
                All paid ✓
              </span>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); toggleAll() }}
                disabled={toggling !== null}
                className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-all disabled:opacity-50"
                style={{
                  background: allPaid ? 'rgba(16,185,129,0.12)' : 'rgba(var(--sq-alpha),0.04)',
                  color: allPaid ? '#6ee7b7' : 'rgba(var(--sq-alpha),0.4)',
                  border: `1px solid ${allPaid ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-alpha),0.08)'}`,
                }}
              >
                {toggling === 'all' ? '…' : allPaid ? 'All paid ✓' : 'Mark all paid'}
              </button>
            )
          )}
          <span className="font-mono text-[10px] text-gray-400">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Per-square rows */}
      {expanded && (
        <div style={{ borderTop: '1px solid rgba(var(--sq-alpha),0.06)' }}>
          {opError && (
            <p className="px-4 py-1.5 font-mono text-[10px] text-red-400">{opError}</p>
          )}
          {player.squares.map((sq) => {
            const stateLabel = sq.is_paid ? 'Paid' : sq.payment_pending ? 'Pending' : 'Unpaid'
            const stateColor = sq.is_paid ? '#6ee7b7' : sq.payment_pending ? '#facc15' : 'rgba(var(--sq-alpha),0.3)'
            return (
              <div key={sq.id} className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.04)' }}>
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: stateColor }}>{stateLabel}</span>
                  <span className="font-mono text-[10px] text-gray-400">Row {sq.row_index}, Col {sq.col_index} · ${pricePerSquare}</span>
                </div>
                <div className="flex gap-2">
                  {!sq.is_paid && (
                    <button
                      onClick={() => unassignSquare(sq)}
                      disabled={toggling === sq.id}
                      className="font-display text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
                      style={{ background: 'rgba(220,38,38,0.1)', color: 'rgba(252,165,165,0.7)', border: '1px solid rgba(220,38,38,0.2)' }}
                    >
                      Unassign
                    </button>
                  )}
                  {!(isLocked && sq.is_paid) && (
                    <button
                      onClick={() => toggleSquare(sq)}
                      disabled={toggling === sq.id}
                      className="font-display text-xs font-semibold tracking-wider uppercase px-2 py-1 rounded-sm transition-colors disabled:opacity-50"
                      style={{
                        background: sq.is_paid ? 'rgba(16,185,129,0.12)' : 'rgba(var(--sq-alpha),0.04)',
                        color: sq.is_paid ? '#6ee7b7' : 'rgba(var(--sq-alpha),0.4)',
                        border: `1px solid ${sq.is_paid ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-alpha),0.08)'}`,
                      }}
                    >
                      {sq.is_paid ? 'Mark unpaid' : 'Mark paid'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
