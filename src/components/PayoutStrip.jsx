/**
 * PayoutStrip — shows per-moment payout amounts in the board header.
 * Renders one cell per scoring moment; includes reverse payout if configured.
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
      className="mt-3 grid gap-px rounded-sm overflow-hidden"
      style={{
        gridTemplateColumns: `repeat(${moments.length}, minmax(0, 1fr))`,
        background: 'rgba(var(--sq-accent-rgb),0.1)',
      }}
    >
      {moments.map((moment) => {
        const key = MOMENT_KEY[moment]
        const payout = board[`payout_${key}`]
        const reverse = board[`payout_reverse_${key}`]
        return (
          <div
            key={moment}
            className="px-3 py-2.5 flex flex-col items-center gap-1"
            style={{ background: 'var(--sq-surface)' }}
          >
            <p className="font-mono text-[9px] tracking-[0.18em] text-gray-400 uppercase">{moment}</p>
            <p className="font-display text-lg font-semibold leading-none" style={{ color: 'var(--sq-accent)' }}>
              {payout != null ? `$${payout}` : '—'}
            </p>
            {reverse != null && (
              <p className="font-mono text-[9px] leading-none" style={{ color: 'rgba(var(--sq-accent-rgb),0.6)' }}>
                ↩ ${reverse}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
