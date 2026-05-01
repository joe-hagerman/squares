import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'
import { getTeamLogoUrl } from '../lib/nfl'
import { isBoardLocked } from '../lib/board'

/**
 * Printer-friendly board — light background, app fonts and visual language.
 * Supports both standard and rotating-numbers boards.
 * Route: /board/:boardId/print
 */
export default function PrintableBoard() {
  const { boardId } = useParams()
  const [board, setBoard] = useState(null)
  const [squares, setSquares] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const boardUrl = `${window.location.origin}/board/${boardId}`

  useEffect(() => {
    Promise.all([
      supabase.from('boards').select('*').eq('id', boardId).single(),
      supabase.from('squares').select('*').eq('board_id', boardId),
    ]).then(([{ data: b, error: bErr }, { data: s, error: sErr }]) => {
      if (bErr || sErr) { setError(friendlyError(bErr || sErr, 'load')); setLoading(false); return }
      setBoard(b)
      setSquares(s)
      setLoading(false)
    })
  }, [boardId])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: 'var(--font-mono)', color: '#6b7280' }}>
      Loading…
    </div>
  )
  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ fontFamily: 'var(--font-mono)', color: '#dc2626' }}>
      {error}
    </div>
  )

  const grid = {}
  for (const sq of squares) grid[`${sq.row_index}-${sq.col_index}`] = sq

  const rotating = board.rotate_numbers && board.row_numbers_rotated && board.col_numbers_rotated
  const locked = isBoardLocked(board)
  const moments = board.scoring_moments ?? []
  const N = rotating ? moments.length : 1

  function label(sq) {
    if (!sq?.owner_name) return ''
    if (sq.display_name) return sq.display_name
    return sq.owner_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 3)
  }

  const numCellSize = rotating ? '1.25rem' : '1.75rem'
  const gridTemplateColumns = `repeat(${N}, ${numCellSize}) repeat(10, 1fr)`
  const gridTemplateRows = `repeat(${N}, ${numCellSize}) repeat(10, 1fr)`

  return (
    <div className="printable-board" style={{ minHeight: '100vh', background: '#fff', color: '#111', padding: '24px', fontFamily: 'var(--font-mono)' }}>

      {/* Print button */}
      <div className="print:hidden" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        <button
          onClick={() => window.print()}
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '13px',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            background: '#f59e0b',
            color: '#07070e',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '2px',
            cursor: 'pointer',
          }}
        >
          Print / Save as PDF
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '2px solid #f59e0b', paddingBottom: '16px' }}>
        <div>
          {/* Eyebrow */}
          <p style={{ fontSize: '9px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#b45309', marginBottom: '4px' }}>
            Football Squares
          </p>
          {/* Board name */}
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '28px', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1, marginBottom: '8px', color: '#111' }}>
            {board.name}
          </h1>
          {/* Matchup */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
              {board.away_team}
            </span>
            <span style={{ color: '#f59e0b', fontSize: '8px' }}>◆</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '15px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151' }}>
              {board.home_team}
            </span>
          </div>
          {/* Meta */}
          <p style={{ fontSize: '10px', color: '#6b7280', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            ${board.price_per_square}/sq
            {rotating ? '  ·  Rotating numbers' : ''}
          </p>
          {/* Payouts */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
            <span style={{ fontSize: '8px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#9ca3af' }}>
              Payouts
            </span>
            {moments.map((m) => {
              const key = `payout_${m.toLowerCase()}`
              const val = board[key]
              const rKey = `payout_reverse_${m.toLowerCase()}`
              const rVal = board[rKey]
              if (!val && !rVal) return null
              return (
                <span key={m} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#9ca3af' }}>{m}</span>
                  {val != null && <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', color: '#b45309' }}>${val}</span>}
                  {rVal != null && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: '#b45309', opacity: 0.6 }}>↩${rVal}</span>}
                </span>
              )
            })}
          </div>
        </div>

        {/* QR code */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0, marginLeft: '24px' }}>
          <QRCodeCanvas value={boardUrl} size={90} bgColor="#ffffff" fgColor="#000000" />
          <p style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af', textAlign: 'center' }}>
            Scan for live board
          </p>
        </div>
      </div>

      {/* Home team banner above columns — spacer = away banner (20px) + gap (3px) + row-number col(s) */}
      <div style={{ display: 'flex', marginBottom: '3px' }}>
        <div style={{ width: rotating ? `calc(23px + ${N} * ${numCellSize})` : `calc(23px + ${numCellSize})`, flexShrink: 0 }} />
        <AxisBanner team={board.home_team} orientation="horizontal" />
      </div>

      {/* Away banner + grid */}
      <div className="printable-grid-wrapper" style={{ display: 'flex', gap: '3px' }}>
        {/* Away banner — spacer above skips the header row(s) so banner only covers the 10 data rows */}
        <div style={{ display: 'flex', flexDirection: 'column', flexShrink: 0, width: '20px' }}>
          <div style={{ height: rotating ? `calc(${N} * ${numCellSize})` : numCellSize, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <AxisBanner team={board.away_team} orientation="vertical" />
          </div>
        </div>

        {/* Grid */}
        <div
          style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns,
            gridTemplateRows,
            border: '1px solid #d1d5db',
            borderRadius: '2px',
            overflow: 'hidden',
            fontSize: '10px',
          }}
        >
        {rotating ? (
          <>
            {/* Header rows — one per moment */}
            {moments.map((m, q) => (
              <React.Fragment key={m}>
                {/* Corner cells */}
                {Array.from({ length: N }, (_, j) => (
                  <div key={j} style={{ background: '#fef3c7', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {j === q && (
                      <span style={{ fontSize: '7px', letterSpacing: '0.05em', color: '#b45309', fontWeight: 700 }}>{m}</span>
                    )}
                  </div>
                ))}
                {/* Col number cells */}
                {Array.from({ length: 10 }, (_, c) => (
                  <div key={c} style={{ background: '#fef9ee', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#374151' }}>
                    {locked ? (board.col_numbers_rotated?.[m]?.[c] ?? '?') : '?'}
                  </div>
                ))}
              </React.Fragment>
            ))}

            {/* Data rows */}
            {Array.from({ length: 10 }, (_, r) => (
              <React.Fragment key={r}>
                {/* Row number cells */}
                {moments.map((m) => (
                  <div key={m} style={{ background: '#fef9ee', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#374151' }}>
                    {locked ? (board.row_numbers_rotated?.[m]?.[r] ?? '?') : '?'}
                  </div>
                ))}
                {/* Square cells */}
                {Array.from({ length: 10 }, (_, c) => {
                  const sq = grid[`${r}-${c}`]
                  return (
                    <div key={c} className="printable-cell" style={{ background: sq?.owner_name ? '#f8fafc' : '#fff', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', padding: '1px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '8px', textAlign: 'center', lineHeight: 1.2, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {label(sq)}
                      </span>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </>
        ) : (
          <>
            {/* Standard: single header row + single header column */}
            {/* Corner */}
            <div style={{ background: '#fef3c7', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }} />
            {/* Col headers */}
            {Array.from({ length: 10 }, (_, c) => (
              <div key={c} style={{ background: '#fef9ee', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#374151' }}>
                {locked ? board.col_numbers[c] : '?'}
              </div>
            ))}
            {/* Data rows */}
            {Array.from({ length: 10 }, (_, r) => (
              <React.Fragment key={r}>
                <div style={{ background: '#fef9ee', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#374151' }}>
                  {locked ? board.row_numbers[r] : '?'}
                </div>
                {Array.from({ length: 10 }, (_, c) => {
                  const sq = grid[`${r}-${c}`]
                  return (
                    <div key={c} className="printable-cell" style={{ background: sq?.owner_name ? '#f8fafc' : '#fff', borderRight: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '1', padding: '2px', overflow: 'hidden' }}>
                      <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                        {label(sq)}
                      </span>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </>
        )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#9ca3af' }}>
          {boardUrl}
        </p>
        <p style={{ fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#d1d5db' }}>
          Squares · Game Day Edition
        </p>
      </div>

    </div>
  )
}

// ── PRINT-FRIENDLY AXIS BANNER ─────────────────────────────────────────
function AxisBanner({ team, orientation }) {
  const logoUrl = getTeamLogoUrl(team)
  const isVertical = orientation === 'vertical'

  const baseStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    background: '#fffbeb',
    border: '1px solid #f59e0b',
    borderRadius: '2px',
    overflow: 'hidden',
    flexShrink: isVertical ? 0 : undefined,
  }

  if (isVertical) {
    return (
      <div style={{ ...baseStyle, flexDirection: 'column', width: '20px', height: '100%', padding: '6px 2px' }}>
        {logoUrl && (
          <img src={logoUrl} alt={team} style={{ width: '16px', height: '16px', objectFit: 'contain', transform: 'rotate(-90deg)', flexShrink: 0 }} />
        )}
        <span style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '7px',
          letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151',
          writingMode: 'vertical-rl', transform: 'rotate(180deg)', lineHeight: 1,
        }}>
          {team}
        </span>
        {logoUrl && (
          <img src={logoUrl} alt={team} style={{ width: '16px', height: '16px', objectFit: 'contain', transform: 'rotate(-90deg)', flexShrink: 0 }} />
        )}
      </div>
    )
  }

  return (
    <div style={{ ...baseStyle, flex: 1, height: '22px', padding: '2px 8px' }}>
      {logoUrl && (
        <img src={logoUrl} alt={team} style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
      )}
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '9px',
        letterSpacing: '0.15em', textTransform: 'uppercase', color: '#374151',
        whiteSpace: 'nowrap', lineHeight: 1,
      }}>
        {team}
      </span>
      {logoUrl && (
        <img src={logoUrl} alt={team} style={{ width: '18px', height: '18px', objectFit: 'contain', flexShrink: 0 }} />
      )}
    </div>
  )
}
