import { useState, useEffect, useRef } from 'react'

/**
 * WinnerBanner — slides in when a new winner is detected via real-time.
 * Pass the latest winner object; it dismisses itself after 10s.
 */
export default function WinnerBanner({ winner }) {
  const [visible, setVisible] = useState(false)
  const shownId = useRef(null)

  useEffect(() => {
    if (winner && winner.id !== shownId.current) {
      shownId.current = winner.id
      setVisible(true)
      const t = setTimeout(() => setVisible(false), 10000)
      return () => clearTimeout(t)
    }
  }, [winner?.id])

  if (!visible || !winner) return null

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in">
      <div className="bg-yellow-400 text-gray-900 rounded-2xl px-6 py-4 shadow-2xl flex items-center gap-4 max-w-sm w-full mx-4">
        <span className="text-3xl">🏆</span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg leading-tight truncate">{winner.squares?.owner_name ?? 'Winner!'}</p>
          <p className="text-sm font-medium">{winner.moment}{winner.is_reverse ? ' (Reverse)' : ''} — {winner.away_score}–{winner.home_score}</p>
          {winner.payout && <p className="text-sm font-semibold">${winner.payout} payout</p>}
        </div>
        <button onClick={() => setVisible(false)} aria-label="Dismiss" className="text-gray-700 hover:text-gray-900 text-xl leading-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-gray-900 rounded-sm">✕</button>
      </div>
    </div>
  )
}
