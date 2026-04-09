import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import PaymentMethod from './PaymentMethod'

/**
 * PayoutGroup — all winnings for a single person, grouped for one-shot payment.
 *
 * Props:
 *   square  – the square record (owner contact info, payment handles)
 *   wins    – array of winner records belonging to this square
 *   board   – board record (name, team names)
 */
export default function PayoutGroup({ square, wins, board }) {
  const [notifications, setNotifications] = useState([])
  const [sending, setSending] = useState(null) // 'email' | 'sms' | null
  const [sendError, setSendError] = useState(null)
  const [paidIds, setPaidIds] = useState(() => new Set(wins.filter((w) => w.payout_sent).map((w) => w.id)))
  const [markingSent, setMarkingSent] = useState(false)

  const totalPayout = wins.reduce((sum, w) => sum + (w.payout ?? 0), 0)
  const allPaid = wins.every((w) => paidIds.has(w.id))

  const winIds = useMemo(() => wins.map((w) => w.id).join(','), [wins])

  // Load notification history across all winner ids for this person
  useEffect(() => {
    const ids = wins.map((w) => w.id)
    supabase
      .from('winner_notifications')
      .select('*')
      .in('winner_id', ids)
      .order('sent_at', { ascending: false })
      .then(({ data }) => setNotifications(data ?? []))
  }, [winIds])

  async function notify(method) {
    setSending(method)
    setSendError(null)
    try {
      // Notify for each winner record sequentially
      const results = []
      for (const w of wins) {
        const { data, error } = await supabase.functions.invoke('notify-winner', {
          body: { winner_id: w.id, method },
        })
        if (error) throw new Error(error.message ?? 'Function invocation failed')
        results.push(...(data?.results ?? []))
      }
      const failed = results.filter((r) => !r.success)
      if (failed.length) {
        setSendError(failed.map((r) => `${r.method}: ${r.error_message}`).join(' · '))
      }
      // Refresh notifications
      const { data: notifs } = await supabase
        .from('winner_notifications')
        .select('*')
        .in('winner_id', wins.map((w) => w.id))
        .order('sent_at', { ascending: false })
      setNotifications(notifs ?? [])
    } catch (err) {
      setSendError(err.message)
    } finally {
      setSending(null)
    }
  }

  async function markAllPaid() {
    setMarkingSent(true)
    const unpaidIds = wins.filter((w) => !paidIds.has(w.id)).map((w) => w.id)
    const { error } = await supabase.from('winners').update({ payout_sent: true }).in('id', unpaidIds)
    if (!error) setPaidIds(new Set(wins.map((w) => w.id)))
    setMarkingSent(false)
  }

  const hasSms = !!square.owner_phone
  const hasEmail = !!square.owner_email
  const hasCashapp = !!square.cashapp_handle
  const hasVenmo = !!square.venmo_handle
  const payNote = `${board.name} winnings`

  return (
    <div className="rounded-sm overflow-hidden" style={{ background: 'var(--sq-surface)', border: `1px solid ${allPaid ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-accent-rgb),0.2)'}` }}>

      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between gap-3" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.06)', background: allPaid ? 'rgba(16,185,129,0.05)' : 'rgba(var(--sq-accent-rgb),0.04)' }}>
        <div className="flex items-center gap-3">
          <div>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--sq-text)', lineHeight: 1 }}>
              {square.owner_name}
            </p>
            <div className="flex gap-3 mt-1 flex-wrap">
              {hasEmail && <span className="font-mono text-[10px] text-gray-400">{square.owner_email}</span>}
              {hasSms && <span className="font-mono text-[10px] text-gray-400">{square.owner_phone}</span>}
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          {totalPayout > 0 && (
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '22px', color: allPaid ? '#6ee7b7' : 'var(--sq-accent)', lineHeight: 1 }}>
              ${totalPayout}
            </p>
          )}
          {allPaid && (
            <p className="font-mono text-[10px] mt-0.5" style={{ color: '#6ee7b7' }}>Paid ✓</p>
          )}
        </div>
      </div>

      {/* Win breakdown */}
      <div className="px-4 py-3 space-y-1.5" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.06)' }}>
        {wins.map((w) => (
          <div key={w.id} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: w.is_reverse ? 'rgba(var(--sq-accent-rgb),0.5)' : 'var(--sq-accent)', minWidth: '52px' }}>
                {w.moment}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(var(--sq-alpha),0.55)' }}>
                {w.is_reverse ? 'Reverse' : 'Winner'}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(var(--sq-alpha),0.45)' }}>
                {w.away_score}–{w.home_score}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {w.payout && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(var(--sq-alpha),0.55)' }}>${w.payout}</span>
              )}
              {paidIds.has(w.id) && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#6ee7b7' }}>✓</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-3">

        {sendError && <p className="font-mono text-xs text-red-400">{sendError}</p>}

        {/* Notify */}
        {!allPaid && (hasEmail || hasSms) && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="font-mono text-[10px] tracking-widest uppercase text-gray-400 mr-1">Notify</span>
            {hasEmail && (
              <button
                onClick={() => notify('email')}
                disabled={sending !== null}
                className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
                style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}
              >
                {sending === 'email' ? 'Sending…' : 'Email'}
              </button>
            )}
            {hasSms && (
              <button
                onClick={() => notify('sms')}
                disabled={sending !== null}
                className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
                style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                {sending === 'sms' ? 'Sending…' : 'SMS'}
              </button>
            )}
          </div>
        )}

        {/* Payment links */}
        {!allPaid && totalPayout > 0 && (hasCashapp || hasVenmo) && (
          <div className="flex gap-2 flex-wrap items-center">
            <span className="font-mono text-[10px] tracking-widest uppercase text-gray-400 mr-1">Pay</span>
            {hasCashapp && (
              <PaymentMethod platform="cashapp" handle={square.cashapp_handle} amount={totalPayout} note={payNote} verb="Send" />
            )}
            {hasVenmo && (
              <PaymentMethod platform="venmo" handle={square.venmo_handle} amount={totalPayout} note={payNote} verb="Send" />
            )}
          </div>
        )}

        {/* Mark paid */}
        {!allPaid && (
          <button
            onClick={markAllPaid}
            disabled={markingSent}
            className="font-display text-xs font-semibold tracking-wider uppercase px-3 py-1.5 rounded-sm transition-colors disabled:opacity-50"
            style={{ background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.25)' }}
          >
            {markingSent ? 'Saving…' : wins.length > 1 ? 'Mark all paid' : 'Mark paid'}
          </button>
        )}

        {/* Notification history */}
        {notifications.length > 0 && (
          <div className="space-y-1 pt-1" style={{ borderTop: '1px solid rgba(var(--sq-alpha),0.05)' }}>
            {notifications.map((n) => (
              <div key={n.id} className="flex items-center gap-2 font-mono text-xs text-gray-400">
                <span className={n.success ? 'text-emerald-500' : 'text-red-400'}>{n.success ? '✓' : '✗'}</span>
                <span className="uppercase tracking-wider">{n.method}</span>
                <span>{new Date(n.sent_at).toLocaleString()}</span>
                {!n.success && n.error_message && (
                  <span className="text-red-400 truncate">{n.error_message}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
