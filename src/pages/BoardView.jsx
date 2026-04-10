import { useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import SquaresGrid from '../components/SquaresGrid'
import WinnerBanner from '../components/WinnerBanner'
import FloatingMenu from '../components/FloatingMenu'
import PayoutStrip from '../components/PayoutStrip'
import JoinCodePill from '../components/JoinCodePill'
import { QRCodeCanvas } from 'qrcode.react'

export default function BoardView() {
  const { boardId } = useParams()
  const [board, setBoard] = useState(null)
  const [squares, setSquares] = useState([])
  const [winners, setWinners] = useState([])
  const [latestWinner, setLatestWinner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const channelRef = useRef(null)

  useEffect(() => {
    async function init() {
      const [{ data: boardData, error: bErr }, { data: squaresData, error: sErr }, { data: winnersData }] = await Promise.all([
        supabase.from('boards').select('*').eq('id', boardId).single(),
        supabase.from('squares').select('*').eq('board_id', boardId),
        supabase.from('winners').select('*, squares(owner_name)').eq('board_id', boardId),
      ])
      if (bErr || sErr) { setError((bErr || sErr).message); setLoading(false); return }
      setBoard(boardData)
      setSquares(squaresData)
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
      .on('broadcast', { event: 'winner' }, ({ payload }) => {
        setWinners((prev) => [
          ...prev.filter((w) => !(w.moment === payload.moment && w.is_reverse === payload.is_reverse)),
          payload,
        ])
        setLatestWinner(payload)
      })
      .subscribe()

    return () => { supabase.removeChannel(channelRef.current) }
  }, [boardId])

  if (loading) return <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">Loading…</div>
  if (error) return <div className="min-h-screen bg-gray-950 text-red-400 flex items-center justify-center">{error}</div>

  const claimed = squares.filter((s) => s.owner_name).length
  const winnerSquareIds = new Set(winners.map((w) => w.square_id))

  return (
    <>
    <div className="min-h-screen text-white" style={{ background: 'var(--sq-bg)' }}>
      {/* ── HERO HEADER ───────────────────────────────── */}
      <div className="animate-slide-up" style={{ borderBottom: '1px solid rgba(var(--sq-accent-rgb),0.2)', background: 'linear-gradient(180deg, var(--sq-bg-raised) 0%, var(--sq-bg) 100%)' }}>
        <div className="max-w-2xl mx-auto px-5 pt-6 pb-5">
          {/* Top row: label + board name / QR code */}
          <div className="flex items-start gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[10px] tracking-[0.2em] text-amber-500/60 uppercase">Live Board</span>
              <h1 className="font-display text-3xl font-bold tracking-wide uppercase leading-none mt-1">
                {board.name}
              </h1>
            </div>
            <div className="flex-shrink-0 p-1.5 rounded-sm" style={{ background: '#ffffff' }}>
              <QRCodeCanvas value={`${window.location.origin}/board/${boardId}`} size={54} bgColor="#ffffff" fgColor="#000000" />
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
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-5 pb-28 space-y-5">

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
          winnerSquareIds={winnerSquareIds}
        />

        {/* Winner list */}
        {winners.length > 0 && (
          <WinnerList winners={winners} squares={squares} scoringMoments={board.scoring_moments} />
        )}

      </div>

      <FloatingMenu boardId={boardId} isLocked={board.status === 'locked' || board.status === 'complete'} />
      <WinnerBanner winner={latestWinner} />
    </div>
    </>
  )
}

export function WinnerList({ winners, squares, scoringMoments }) {
  const sorted = [...winners].sort((a, b) => {
    const ai = scoringMoments.indexOf(a.moment)
    const bi = scoringMoments.indexOf(b.moment)
    if (ai !== bi) return ai - bi
    return (a.is_reverse ? 1 : 0) - (b.is_reverse ? 1 : 0)
  })

  return (
    <div className="space-y-2">
      <p className="font-mono text-[10px] tracking-[0.2em] text-gray-400 uppercase">Winners</p>
      <div className="rounded-sm overflow-hidden" style={{ background: 'var(--sq-surface)', border: '1px solid rgba(var(--sq-accent-rgb),0.15)' }}>
        {sorted.map((w, i) => {
          const sq = squares.find((s) => s.id === w.square_id)
          return (
            <div key={w.id} className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: i < sorted.length - 1 ? '1px solid rgba(var(--sq-alpha),0.06)' : undefined }}>
              <div className="flex items-center gap-3">
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: w.is_reverse ? 'rgba(var(--sq-accent-rgb),0.5)' : 'var(--sq-accent)', minWidth: '36px' }}>
                  {w.moment}
                </span>
                <span className="font-mono text-[10px] text-gray-400">
                  {w.is_reverse ? 'Reverse' : 'Winner'}
                </span>
                <span className="font-mono text-[10px] text-gray-500">
                  {w.away_score}–{w.home_score}
                </span>
              </div>
              <div className="text-right">
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--sq-text)' }}>
                  {sq?.owner_name ?? '—'}
                </p>
                {w.payout && <p className="font-mono text-[10px] text-gray-400">${w.payout}</p>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

