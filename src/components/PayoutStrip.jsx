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
              <span className="relative group/rev">
                <span
                  className="font-mono text-[9px] leading-none cursor-default"
                  style={{ color: 'rgba(var(--sq-accent-rgb),0.45)' }}
                >
                  +${reverse}↩
                </span>
                <span
                  className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 rounded-sm px-2.5 py-2 font-mono text-[10px] leading-relaxed opacity-0 group-hover/rev:opacity-100 transition-opacity z-50 whitespace-normal"
                  style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.7)' }}
                >
                  Reverse payout — awarded when the winning digits are flipped (e.g. home 3 / away 7 also pays home 7 / away 3)
                </span>
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
