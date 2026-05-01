/**
 * SquaresGrid — the 10x10 board
 *
 * Props:
 *   squares             – array of square rows from DB
 *   homeTeam            – home team name (optional, shows banner on top axis)
 *   awayTeam            – away team name (optional, shows banner on left axis)
 *   mySquareIds         – set of square IDs owned by the current player (highlights green)
 *   winnerSquareIds     – set of square IDs to highlight gold (winners)
 *   onClaim             – (square) => void  |  null for read-only mode
 *   onUnclaim           – (square) => void  |  null if unclaiming not allowed
 *   rowNumbers          – int[10] or null (standard mode, revealed after lock)
 *   colNumbers          – int[10] or null (standard mode, revealed after lock)
 *   rotateNumbers       – boolean — show per-quarter number sets
 *   rotatedRowNumbers   – { [moment]: int[10] } or null
 *   rotatedColNumbers   – { [moment]: int[10] } or null
 *   scoringMoments      – string[] (order for rotating display)
 *   mode                – 'default' | 'payment'
 */
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import TeamBanner from './TeamBanner'

const AWAY_BANNER_W = '2.25rem'
const NUM_CELL = '1.5rem'   // size of each number header cell (rotating mode)
const NUM_CELL_STD = '2rem' // standard (non-rotating) number cell size

const SquaresGrid = React.memo(function SquaresGrid({
  squares,
  homeTeam,
  awayTeam,
  mySquareIds = new Set(),
  winnerSquareIds = new Set(),
  onClaim = null,
  onUnclaim = null,
  rowNumbers = null,
  colNumbers = null,
  rotateNumbers = false,
  rotatedRowNumbers = null,
  rotatedColNumbers = null,
  scoringMoments = [],
  mode = 'default',
}) {
  const grid = useMemo(() => {
    const g = {}
    for (const sq of squares) g[`${sq.row_index}-${sq.col_index}`] = sq
    return g
  }, [squares])

  const [tooltip, setTooltip] = useState(null) // { name, x, y, above }
  const tooltipTimer = useRef(null)

  useEffect(() => () => clearTimeout(tooltipTimer.current), [])

  const revealName = useCallback((e, name) => {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    const above = rect.top > 80
    setTooltip({
      name,
      x: rect.left + rect.width / 2,
      y: above ? rect.top : rect.bottom,
      above,
    })
    tooltipTimer.current = setTimeout(() => setTooltip(null), 2000)
  }, [])

  function cellStyle(sq) {
    if (!sq) return 'sq-cell-empty'
    if (winnerSquareIds.has(sq.id)) return 'sq-cell-winner'
    if (mode === 'payment') {
      if (!sq.owner_name) return 'sq-cell-empty'
      if (sq.is_paid) return 'sq-cell-paid'
      if (sq.payment_pending) return 'sq-cell-pending'
      return 'sq-cell-unpaid'
    }
    const isMine = mySquareIds.has(sq.id)
    if (isMine) return onUnclaim ? 'sq-cell-mine sq-unclaim cursor-pointer' : 'sq-cell-mine'
    if (sq.owner_name) return 'sq-cell-claimed cursor-default'
    if (onClaim) return 'sq-cell-empty sq-claim cursor-pointer'
    return 'sq-cell-empty'
  }

  function label(sq) {
    if (!sq?.owner_name) return ''
    if (sq.display_name) return sq.display_name
    // initials fallback
    return sq.owner_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 3)
  }

  const showBanners = homeTeam || awayTeam

  const GRID_STYLE = {
    background: 'rgba(var(--sq-alpha),0.1)',
    border: '1px solid rgba(var(--sq-alpha),0.1)',
  }
  const HEADER_STYLE = { background: 'var(--sq-surface)' }

  // ── ROTATING MODE ──────────────────────────────────────────────────
  if (rotateNumbers && scoringMoments.length > 0) {
    const N = scoringMoments.length
    // Each number cell is NUM_CELL wide/tall; corner is N×N
    const gridTemplateColumns = `repeat(${N}, ${NUM_CELL}) repeat(10, minmax(0, 1fr))`
    const headerHeight = `calc(${N} * ${NUM_CELL})`

    return (
      <div className="w-full">
        <div>

          {/* HOME TEAM BANNER */}
          {showBanners && (
            <div className="flex mb-1" style={{ gap: '3px' }}>
              <div style={{ width: awayTeam ? `calc(${AWAY_BANNER_W} + 3px + ${N} * ${NUM_CELL})` : `calc(${N} * ${NUM_CELL})`, flexShrink: 0 }} />
              <div style={{ flex: 1, height: '2.5rem' }}>
                {homeTeam && <TeamBanner teamName={homeTeam} orientation="horizontal" />}
              </div>
            </div>
          )}

          {/* GRID ROW */}
          <div className="flex" style={{ gap: '3px' }}>

            {/* Away team banner */}
            {awayTeam && (
              <div style={{ width: AWAY_BANNER_W, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ height: headerHeight, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <TeamBanner teamName={awayTeam} orientation="vertical" />
                </div>
              </div>
            )}

            {/* 10×10 grid with multi-quarter headers */}
            <div
              style={{ flex: 1, display: 'grid', gridTemplateColumns, gridTemplateRows: `repeat(${N}, ${NUM_CELL}) repeat(10, minmax(0, 1fr))`, ...GRID_STYLE }}
              className="gap-px rounded-lg overflow-hidden text-xs select-none"
            >
              {/* Header rows: one per scoring moment */}
              {scoringMoments.map((m, q) => (
                <React.Fragment key={m}>
                  {/* Corner cells for this row — diagonal label */}
                  {Array.from({ length: N }, (_, j) => (
                    <div key={j} className="flex items-center justify-center overflow-hidden" style={HEADER_STYLE}>
                      {j === q && (
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '7px', color: 'rgba(var(--sq-accent-rgb),0.55)', letterSpacing: '0.05em', lineHeight: 1 }}>
                          {m}
                        </span>
                      )}
                    </div>
                  ))}
                  {/* Col number cells for this moment */}
                  {Array.from({ length: 10 }, (_, c) => (
                    <div key={c} className="flex items-center justify-center font-bold text-gray-400" style={{ fontSize: '10px', ...HEADER_STYLE }}>
                      {rotatedColNumbers?.[m]?.[c] ?? '?'}
                    </div>
                  ))}
                </React.Fragment>
              ))}

              {/* Data rows */}
              {Array.from({ length: 10 }, (_, r) => (
                <React.Fragment key={r}>
                  {/* Row number cells — one per scoring moment */}
                  {scoringMoments.map((m) => (
                    <div key={m} className="flex items-center justify-center font-bold text-gray-400" style={{ fontSize: '10px', ...HEADER_STYLE }}>
                      {rotatedRowNumbers?.[m]?.[r] ?? '?'}
                    </div>
                  ))}
                  {/* Square cells */}
                  {Array.from({ length: 10 }, (_, c) => {
                    const sq = grid[`${r}-${c}`]
                    const isMine = sq && mySquareIds.has(sq.id)
                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={(e) => {
                          if (isMine && onUnclaim) return onUnclaim(sq)
                          if (!sq?.owner_name && onClaim && sq) return onClaim(sq)
                          if (sq?.owner_name) revealName(e, sq.owner_name)
                        }}
                        className={`flex items-center justify-center aspect-square transition-colors ${cellStyle(sq)}`}
                        style={{ padding: '1px', minWidth: 0 }}
                      >
                        <span className={`block w-full text-center leading-tight overflow-hidden ${isMine ? 'text-white font-semibold' : 'text-gray-300'}`}
                          style={{ fontSize: '7px', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {label(sq)}
                        </span>
                      </div>
                    )
                  })}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        <Legend mode={mode} winnerSquareIds={winnerSquareIds} mySquareIds={mySquareIds} />
        <CellTooltip tooltip={tooltip} />
      </div>
    )
  }

  // ── STANDARD MODE ──────────────────────────────────────────────────
  return (
    <div className="w-full">
      <div>

        {/* HOME TEAM BANNER (top) */}
        {showBanners && (
          <div className="flex mb-1" style={{ gap: '3px' }}>
            <div style={{ width: awayTeam ? `calc(${AWAY_BANNER_W} + 3px + ${NUM_CELL_STD})` : NUM_CELL_STD, flexShrink: 0 }} />
            <div style={{ flex: 1, height: '2.5rem' }}>
              {homeTeam && <TeamBanner teamName={homeTeam} orientation="horizontal" />}
            </div>
          </div>
        )}

        {/* GRID ROW (away banner + grid) */}
        <div className="flex" style={{ gap: '3px' }}>

          {/* Away team banner (left, vertical) */}
          {awayTeam && (
            <div style={{ width: AWAY_BANNER_W, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: NUM_CELL_STD, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <TeamBanner teamName={awayTeam} orientation="vertical" />
              </div>
            </div>
          )}

          {/* The actual 10×10 grid */}
          <div
            style={{ flex: 1, display: 'grid', gridTemplateColumns: `${NUM_CELL_STD} repeat(10, minmax(0, 1fr))`, gridTemplateRows: `${NUM_CELL_STD} repeat(10, minmax(0, 1fr))`, ...GRID_STYLE }}
            className="gap-px rounded-lg overflow-hidden text-xs select-none"
          >
            {/* Corner */}
            <div style={HEADER_STYLE} />

            {/* Column number headers */}
            {Array.from({ length: 10 }, (_, c) => (
              <div key={c} className="flex items-center justify-center font-bold text-gray-400" style={HEADER_STYLE}>
                {colNumbers ? colNumbers[c] : '?'}
              </div>
            ))}

            {/* Rows */}
            {Array.from({ length: 10 }, (_, r) => (
              <React.Fragment key={r}>
                <div className="flex items-center justify-center font-bold text-gray-400" style={HEADER_STYLE}>
                  {rowNumbers ? rowNumbers[r] : '?'}
                </div>
                {Array.from({ length: 10 }, (_, c) => {
                  const sq = grid[`${r}-${c}`]
                  const isMine = sq && mySquareIds.has(sq.id)
                  return (
                    <div
                      key={`${r}-${c}`}
                      onClick={(e) => {
                        if (isMine && onUnclaim) return onUnclaim(sq)
                        if (!sq?.owner_name && onClaim && sq) return onClaim(sq)
                        if (sq?.owner_name) revealName(e, sq.owner_name)
                      }}
                      className={`flex items-center justify-center aspect-square p-0.5 transition-colors ${cellStyle(sq)}`}
                    >
                      <span className={`truncate text-center leading-tight ${isMine ? 'text-white font-semibold' : 'text-gray-300'}`}>
                        {label(sq)}
                      </span>
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <Legend mode={mode} winnerSquareIds={winnerSquareIds} mySquareIds={mySquareIds} />
      <CellTooltip tooltip={tooltip} />
    </div>
  )
})
export default SquaresGrid

function Legend({ mode, winnerSquareIds, mySquareIds }) {
  return (
    <div className="flex gap-4 mt-2 text-xs text-gray-400">
      {winnerSquareIds.size > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-winner)', boxShadow: 'inset 0 0 0 1.5px rgba(var(--sq-accent-rgb),0.65)' }} /> Winner</span>}
      {mode === 'payment' ? (
        <>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-paid)' }} /> Paid</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-unpaid)' }} /> Unpaid</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-empty)' }} /> Open</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-pending)' }} /> Pending</span>
        </>
      ) : (
        <>
          {mySquareIds.size > 0 && <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-mine)' }} /> Mine</span>}
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-claimed)' }} /> Taken</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded inline-block" style={{ background: 'var(--sq-cell-empty)' }} /> Open</span>
        </>
      )}
    </div>
  )
}

function CellTooltip({ tooltip }) {
  if (!tooltip) return null
  const { name, x, y, above } = tooltip
  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: x,
        top: above ? y - 6 : y + 6,
        transform: above ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
        zIndex: 9999,
        pointerEvents: 'none',
        animation: 'sq-tooltip-in 0.15s ease-out forwards',
      }}
    >
      <div
        className="font-mono text-xs px-2.5 py-1.5 rounded-sm whitespace-nowrap"
        style={{
          background: 'var(--sq-surface)',
          border: '1px solid rgba(var(--sq-accent-rgb),0.35)',
          color: 'rgba(var(--sq-alpha),0.85)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {name}
      </div>
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-50%)',
        ...(above
          ? { bottom: -4, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderTop: '4px solid rgba(var(--sq-accent-rgb),0.35)' }
          : { top: -4, borderLeft: '4px solid transparent', borderRight: '4px solid transparent', borderBottom: '4px solid rgba(var(--sq-accent-rgb),0.35)' }
        ),
        width: 0, height: 0,
      }} />
    </div>,
    document.body
  )
}
