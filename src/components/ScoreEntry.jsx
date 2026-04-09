import { useState, useMemo, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { isBoardLocked } from '../lib/board'

/**
 * ScoreEntry — game-day score input.
 *
 * Zone 1: Moment selector pills — all moments visible, auto-advances after submit
 * Zone 2: Scoreboard-style entry with live "winning digit" badges
 * Zone 3: Winner preview — live lookup before committing
 */
export default function ScoreEntry({ board, squares, scoreUpdates, winners, channel, readOnly = false, onScoreSubmitted }) {
  // Latest score per moment
  const latestScores = useMemo(() => {
    const map = {}
    for (const s of scoreUpdates) {
      if (!map[s.moment] || s.entered_at > map[s.moment].entered_at) map[s.moment] = s
    }
    return map
  }, [scoreUpdates])

  // Auto-select first unscored moment on mount
  const firstUnscored = board.scoring_moments.find((m) => !latestScores[m]) ?? board.scoring_moments[0]
  const [moment, setMoment] = useState(firstUnscored)
  const [homeScore, setHomeScore] = useState('')
  const [awayScore, setAwayScore] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  // Clear inputs when moment changes
  useEffect(() => {
    setHomeScore('')
    setAwayScore('')
    setError(null)
  }, [moment])

  const isLocked = isBoardLocked(board)

  const primaryByMoment = {}
  const reverseByMoment = {}
  for (const w of winners) {
    if (w.is_reverse) reverseByMoment[w.moment] = w
    else primaryByMoment[w.moment] = w
  }

  function findWinningSquare(homeDigit, awayDigit, m) {
    let colIndex, rowIndex
    if (board.rotate_numbers && board.col_numbers_rotated) {
      colIndex = (board.col_numbers_rotated[m] ?? []).indexOf(homeDigit)
      rowIndex = (board.row_numbers_rotated[m] ?? []).indexOf(awayDigit)
    } else {
      colIndex = (board.col_numbers ?? []).indexOf(homeDigit)
      rowIndex = (board.row_numbers ?? []).indexOf(awayDigit)
    }
    return squares.find((s) => s.row_index === rowIndex && s.col_index === colIndex) ?? null
  }

  // Live winner preview — derived from current inputs, no DB
  const homeInt = parseInt(homeScore)
  const awayInt = parseInt(awayScore)
  const bothEntered = !isNaN(homeInt) && !isNaN(awayInt) && homeScore !== '' && awayScore !== ''
  const previewHomeDigit = bothEntered ? homeInt % 10 : null
  const previewAwayDigit = bothEntered ? awayInt % 10 : null
  const previewPrimary = bothEntered && isLocked ? findWinningSquare(previewHomeDigit, previewAwayDigit, moment) : null
  const previewReverse = bothEntered && isLocked && previewHomeDigit !== previewAwayDigit
    ? findWinningSquare(previewAwayDigit, previewHomeDigit, moment)
    : null
  const reversePayout = board[`payout_reverse_${moment.toLowerCase()}`] ?? null
  const primaryPayout = board[`payout_${moment.toLowerCase()}`] ?? null

  const isCorrection = !!latestScores[moment]

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    if (readOnly) { setError('Scores are locked once payouts have begun.'); return }
    if (!isLocked) { setError('Board must be locked before entering scores.'); return }
    if (!bothEntered || homeInt < 0 || awayInt < 0) { setError('Enter valid scores.'); return }

    setSubmitting(true)
    try {
      const { error: scoreErr } = await supabase.from('score_updates').insert({
        board_id: board.id, moment, home_score: homeInt, away_score: awayInt,
      })
      if (scoreErr) throw scoreErr

      const primarySquare = findWinningSquare(previewHomeDigit, previewAwayDigit, moment)
      if (!primarySquare) throw new Error('Could not find winning square — is the board locked?')

      // Insert new winners first so there is never a window with zero winners for this moment
      const { data: newWinner, error: winErr } = await supabase.from('winners').insert({
        board_id: board.id, square_id: primarySquare.id, moment,
        home_score: homeInt, away_score: awayInt, payout: primaryPayout, is_reverse: false,
      }).select().single()
      if (winErr) throw winErr

      const keptIds = [newWinner.id]
      if (reversePayout && previewHomeDigit !== previewAwayDigit) {
        const reverseSquare = findWinningSquare(previewAwayDigit, previewHomeDigit, moment)
        if (reverseSquare) {
          const { data: revWinner } = await supabase.from('winners').insert({
            board_id: board.id, square_id: reverseSquare.id, moment,
            home_score: homeInt, away_score: awayInt, payout: reversePayout, is_reverse: true,
          }).select().single()
          if (revWinner) keptIds.push(revWinner.id)
        }
      }

      // Delete stale winners for this moment (those not just inserted)
      await supabase.from('winners')
        .delete()
        .eq('board_id', board.id)
        .eq('moment', moment)
        .not('id', 'in', `(${keptIds.join(',')})`)

      if (primarySquare.owner_name) {
        const winnerPayload = { ...newWinner, squares: { owner_name: primarySquare.owner_name } }
        await channel?.send({ type: 'broadcast', event: 'winner', payload: winnerPayload })
        onScoreSubmitted(winnerPayload)
      } else {
        onScoreSubmitted(null)
      }

      // Auto-advance to next unscored moment
      const updatedScored = { ...latestScores, [moment]: true }
      const next = board.scoring_moments.find((m) => !updatedScored[m])
      if (next) setMoment(next)
      else { setHomeScore(''); setAwayScore('') }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* ── ZONE 1: Moment pills ── */}
      <div className="flex gap-2 flex-wrap">
        {board.scoring_moments.map((m) => {
          const scored = latestScores[m]
          const isActive = m === moment
          const primary = primaryByMoment[m]
          const sq = primary ? squares.find((s) => s.id === primary.square_id) : null
          return (
            <button
              key={m}
              onClick={() => setMoment(m)}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                letterSpacing: '0.1em',
                fontSize: '11px',
                textTransform: 'uppercase',
                padding: '6px 12px',
                borderRadius: '2px',
                border: isActive
                  ? '1px solid var(--sq-accent)'
                  : scored
                    ? '1px solid rgba(16,185,129,0.4)'
                    : '1px solid rgba(var(--sq-alpha),0.1)',
                background: isActive
                  ? 'rgba(var(--sq-accent-rgb),0.15)'
                  : scored
                    ? 'rgba(16,185,129,0.08)'
                    : 'rgba(var(--sq-alpha),0.03)',
                color: isActive ? 'var(--sq-accent)' : scored ? '#6ee7b7' : 'rgba(var(--sq-alpha),0.35)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '2px',
                minWidth: '52px',
              }}
            >
              <span>{m}</span>
              {scored && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 400, opacity: 0.7 }}>
                  {scored.away_score}–{scored.home_score}
                </span>
              )}
              {!scored && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', fontWeight: 400, opacity: 0.4 }}>
                  pending
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── ZONE 2: Scoreboard entry ── */}
      {!readOnly && <form onSubmit={handleSubmit}>
        <div className="rounded-sm overflow-hidden" style={{ background: 'var(--sq-surface)', border: '1px solid rgba(var(--sq-alpha),0.07)' }}>

          {/* Scoreboard header */}
          <div className="px-4 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.06)', background: 'rgba(var(--sq-accent-rgb),0.04)' }}>
            <span className="w-0.5 h-3 rounded-full" style={{ background: 'var(--sq-accent)' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.4)' }}>
              {isCorrection ? `Correct ${moment} Score` : `Enter ${moment} Score`}
            </span>
          </div>

          {/* Score inputs — two columns */}
          <div className="grid grid-cols-2 divide-x" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.06)', divideColor: 'rgba(var(--sq-alpha),0.06)' }}>
            {[
              { label: board.away_team, value: awayScore, onChange: setAwayScore, digit: previewAwayDigit },
              { label: board.home_team, value: homeScore, onChange: setHomeScore, digit: previewHomeDigit },
            ].map(({ label, value, onChange, digit }) => (
              <div key={label} className="p-4 flex flex-col items-center gap-3" style={{ borderRight: '1px solid rgba(var(--sq-alpha),0.06)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.4)' }}>
                  {label}
                </span>

                <input
                  type="number"
                  min="0"
                  required
                  readOnly={readOnly}
                  value={value}
                  onChange={(e) => !readOnly && onChange(e.target.value)}
                  placeholder="—"
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '52px',
                    lineHeight: 1,
                    color: 'var(--sq-text)',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    textAlign: 'center',
                    width: '100%',
                    caretColor: 'var(--sq-accent)',
                    appearance: 'textfield',
                    MozAppearance: 'textfield',
                  }}
                />

                {/* Winning digit badge */}
                <div style={{
                  height: '28px',
                  minWidth: '40px',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '14px',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                  background: digit !== null ? 'rgba(var(--sq-accent-rgb),0.15)' : 'rgba(var(--sq-alpha),0.04)',
                  border: digit !== null ? '1px solid rgba(var(--sq-accent-rgb),0.4)' : '1px solid rgba(var(--sq-alpha),0.08)',
                  color: digit !== null ? 'var(--sq-accent)' : 'rgba(var(--sq-alpha),0.15)',
                }}>
                  {digit !== null ? digit : '·'}
                </div>

                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '8px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.2)' }}>
                  winning digit
                </span>
              </div>
            ))}
          </div>

          {/* ── ZONE 3: Winner preview ── */}
          {bothEntered && isLocked && (
            <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid rgba(var(--sq-alpha),0.06)', background: 'rgba(var(--sq-accent-rgb),0.03)' }}>
              {previewPrimary ? (
                <WinnerPreviewRow
                  label="Winner"
                  name={previewPrimary.owner_name}
                  payout={primaryPayout}
                />
              ) : (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(255,100,100,0.7)' }}>
                  No square found for {previewAwayDigit}–{previewHomeDigit}
                </p>
              )}
              {reversePayout && previewHomeDigit !== previewAwayDigit && previewReverse && (
                <WinnerPreviewRow
                  label="Reverse"
                  name={previewReverse.owner_name}
                  payout={reversePayout}
                />
              )}
            </div>
          )}

          {/* Submit */}
          <div className="p-4">
            {error && <p className="font-mono text-xs text-red-400 mb-3">{error}</p>}
            <button
              type="submit"
              disabled={submitting || !isLocked || !bothEntered || readOnly}
              style={{
                width: '100%',
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                padding: '12px',
                borderRadius: '2px',
                border: 'none',
                cursor: submitting || !isLocked || !bothEntered || readOnly ? 'not-allowed' : 'pointer',
                opacity: submitting || !isLocked || !bothEntered || readOnly ? 0.4 : 1,
                background: isCorrection ? 'rgba(var(--sq-accent-rgb),0.15)' : '#f59e0b',
                color: isCorrection ? 'var(--sq-accent)' : '#07070e',
                border: isCorrection ? '1px solid rgba(var(--sq-accent-rgb),0.4)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {submitting ? 'Saving…' : isCorrection ? `Correct ${moment} Score` : `Confirm & Broadcast ${moment}`}
            </button>
          </div>
        </div>
      </form>}

      {/* ── Past results strip ── */}
      {board.scoring_moments.some((m) => latestScores[m]) && (
        <div className="space-y-1.5">
          {board.scoring_moments.filter((m) => latestScores[m] && (readOnly || m !== moment)).map((m) => {
            const score = latestScores[m]
            const primary = primaryByMoment[m]
            const reverse = reverseByMoment[m]
            const primarySq = primary ? squares.find((s) => s.id === primary.square_id) : null
            const reverseSq = reverse ? squares.find((s) => s.id === reverse.square_id) : null
            return (
              <div key={m} className="flex items-center gap-3 px-3 py-2 rounded-sm" style={{ background: 'rgba(var(--sq-alpha),0.02)', border: '1px solid rgba(var(--sq-alpha),0.05)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.3)', minWidth: '36px' }}>{m}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(var(--sq-alpha),0.25)', minWidth: '60px' }}>
                  {score.away_score}–{score.home_score}
                </span>
                <div className="flex gap-3 flex-wrap">
                  {primarySq && <CompactResult label="W" name={primarySq.owner_name} payout={primary.payout} />}
                  {reverseSq && <CompactResult label="R" name={reverseSq.owner_name} payout={reverse.payout} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function WinnerPreviewRow({ label, name, payout }) {
  return (
    <div className="flex items-center gap-2">
      <span style={{ fontFamily: 'var(--font-display)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--sq-accent)', minWidth: '48px' }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--sq-text)' }}>
        {name ?? <span style={{ color: 'rgba(var(--sq-alpha),0.3)' }}>Unclaimed square</span>}
      </span>
      {payout && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(var(--sq-accent-rgb),0.6)' }}>${payout}</span>
      )}
    </div>
  )
}

function CompactResult({ label, name, payout }) {
  return (
    <div className="flex items-center gap-1.5">
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', color: 'rgba(var(--sq-accent-rgb),0.5)', fontWeight: 600 }}>{label}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'rgba(var(--sq-alpha),0.4)' }}>{name}</span>
      {payout && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(var(--sq-alpha),0.2)' }}>${payout}</span>}
    </div>
  )
}
