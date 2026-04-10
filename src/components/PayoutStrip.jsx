/**
 * PayoutStrip — shows per-moment payout amounts in the board header.
 * Minimal inline layout: moment label + amount, with reverse payout shown
 * as a secondary indicator when configured.
 * Used identically in AdminDashboard, BoardView, and PlayerView.
 */

const MOMENT_KEY = { Q1: 'q1', Q2: 'q2', Q3: 'q3', Q4: 'q4', Final: 'final' }

export default function PayoutStrip({ board }) {
  const moments = board.scoring_moments ?? []
  if (!moments.length) return null

  const hasAny = moments.some((m) => board[`payout_${MOMENT_KEY[m]}`] != null)
  if (!hasAny) return null

  return (
    <div
      className="mt-3 pt-3 flex items-baseline flex-wrap gap-x-4 gap-y-1"
      style={{ borderTop: '1px solid rgba(var(--sq-alpha),0.06)' }}
    >
      <span
        className="font-mono text-[9px] tracking-[0.22em] uppercase"
        style={{ color: 'rgba(var(--sq-alpha),0.2)' }}
      >
        Payouts
      </span>

      {moments.map((moment) => {
        const key = MOMENT_KEY[moment]
        const payout = board[`payout_${key}`]
        const reverse = board[`payout_reverse_${key}`]
        return (
          <div key={moment} className="flex items-baseline gap-1.5">
            <span
              className="font-mono text-[9px] tracking-[0.1em] uppercase"
              style={{ color: 'rgba(var(--sq-alpha),0.3)' }}
            >
              {moment}
            </span>
            <span
              className="font-display text-sm font-semibold leading-none"
              style={{ color: 'var(--sq-accent)' }}
            >
              {payout != null ? `$${payout}` : '—'}
            </span>
            {reverse != null && (
              <span
                className="font-mono text-[9px] leading-none"
                style={{ color: 'rgba(var(--sq-accent-rgb),0.45)' }}
              >
                +${reverse}↩
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
