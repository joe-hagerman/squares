import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { fetchNFLGames } from '../lib/nfl'
import { QUARTER_MOMENTS, END_MOMENTS } from '../lib/constants'
import { generateJoinCode } from '../lib/board'
import { useAuth } from '../context/AuthContext'

export default function CreateBoard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [gamesError, setGamesError] = useState(null)

  const [boardName, setBoardName] = useState('')
  const [selectedGameId, setSelectedGameId] = useState('')
  const [price, setPrice] = useState('10')
  const [moments, setMoments] = useState(['Q1', 'Q2', 'Q3', 'Q4'])
  const [payouts, setPayouts] = useState({ Q1: '', Q2: '', Q3: '', Q4: '', Final: '' })
  const [reversePayouts, setReversePayouts] = useState({ Q1: '', Q2: '', Q3: '', Q4: '', Final: '' })
  const [rotateNumbers, setRotateNumbers] = useState(false)
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState(user?.email ?? '')
  const [adminPhone, setAdminPhone] = useState('')
  const [adminCashapp, setAdminCashapp] = useState('')
  const [adminVenmo, setAdminVenmo] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchNFLGames()
      .then((g) => {
        setGames(g)
        if (g.length > 0) setSelectedGameId(g[0].id)
      })
      .catch((e) => setGamesError(e.message))
      .finally(() => setGamesLoading(false))
  }, [])

  function toggleMoment(m) {
    setMoments((prev) => {
      if (prev.includes(m)) return prev.filter((x) => x !== m)
      if (m === 'Q4') return [...prev.filter((x) => x !== 'Final'), m]
      if (m === 'Final') return [...prev.filter((x) => x !== 'Q4'), m]
      return [...prev, m]
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!selectedGameId) return setError('Please select an NFL game.')
    if (moments.length === 0) return setError('Select at least one scoring moment.')
    if (!adminName.trim() || !adminEmail.trim()) return setError('Admin name and email are required.')
    if (!adminCashapp.trim() && !adminVenmo.trim()) return setError('At least one payment method (Cash App or Venmo) is required.')

    const game = games.find((g) => g.id === selectedGameId)

    setSubmitting(true)
    try {
      const { data: board, error: boardErr } = await supabase
        .from('boards')
        .insert({
          name: boardName.trim() || game.shortName,
          game_id: game.id,
          home_team: game.homeTeam,
          away_team: game.awayTeam,
          user_id: user.id,
          price_per_square: parseFloat(price) || 10,
          payout_q1: moments.includes('Q1') ? parseFloat(payouts.Q1) || null : null,
          payout_q2: moments.includes('Q2') ? parseFloat(payouts.Q2) || null : null,
          payout_q3: moments.includes('Q3') ? parseFloat(payouts.Q3) || null : null,
          payout_q4: moments.includes('Q4') ? parseFloat(payouts.Q4) || null : null,
          payout_final: moments.includes('Final') ? parseFloat(payouts.Final) || null : null,
          payout_reverse_q1: moments.includes('Q1') ? parseFloat(reversePayouts.Q1) || null : null,
          payout_reverse_q2: moments.includes('Q2') ? parseFloat(reversePayouts.Q2) || null : null,
          payout_reverse_q3: moments.includes('Q3') ? parseFloat(reversePayouts.Q3) || null : null,
          payout_reverse_q4: moments.includes('Q4') ? parseFloat(reversePayouts.Q4) || null : null,
          payout_reverse_final: moments.includes('Final') ? parseFloat(reversePayouts.Final) || null : null,
          scoring_moments: moments,
          rotate_numbers: rotateNumbers,
          join_code: generateJoinCode(),
        })
        .select()
        .single()

      if (boardErr) throw boardErr

      const { error: adminErr } = await supabase.from('board_admins').insert(
        { board_id: board.id, name: adminName.trim(), email: adminEmail.trim(), phone: adminPhone.trim() || null, cashapp_handle: adminCashapp.trim() || null, venmo_handle: adminVenmo.trim() || null }
      )
      if (adminErr) throw adminErr

      const squares = []
      for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 10; col++) {
          squares.push({ board_id: board.id, row_index: row, col_index: col })
        }
      }
      const { error: squaresErr } = await supabase.from('squares').insert(squares)
      if (squaresErr) throw squaresErr

      navigate(`/board/${board.id}/admin`)
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const selectedGame = games.find((g) => g.id === selectedGameId)

  return (
    <div className="min-h-screen dot-grid text-white" style={{ background: 'var(--sq-bg)' }}>

      {/* Page header */}
      <div style={{ borderBottom: '1px solid rgba(var(--sq-accent-rgb),0.15)', background: 'linear-gradient(180deg, var(--sq-bg-raised) 0%, var(--sq-bg) 100%)' }}>
        <div className="max-w-xl mx-auto px-5 pt-6 pb-5">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 transition-colors hover:text-[var(--sq-accent)]"
              style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.15em', color: 'rgba(var(--sq-alpha),0.3)', textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ← Back
            </button>
            <button
              onClick={async () => { await signOut(); navigate('/') }}
              className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-sm transition-colors"
              style={{ color: 'rgba(var(--sq-alpha),0.55)', border: '1px solid rgba(var(--sq-alpha),0.2)', background: 'none', cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
          <p className="animate-slide-up" style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.3em', color: 'rgba(var(--sq-accent-rgb),0.6)', textTransform: 'uppercase', marginBottom: '6px' }}>
            Commissioner Setup
          </p>
          <h1 className="animate-slide-up font-display text-3xl font-bold uppercase tracking-wide text-white leading-none" style={{ animationDelay: '40ms' }}>
            Create a Board
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="max-w-xl mx-auto px-5 py-6 space-y-1">

          {/* ── THE GAME ─────────────────────────────── */}
          <Section label="The Game" delay="80ms">
            <div className="space-y-4">
              {gamesLoading ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(var(--sq-accent-rgb),0.5)', letterSpacing: '0.15em' }} className="animate-pulse">
                  Loading games…
                </p>
              ) : gamesError ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#f87171' }}>
                  Could not load games: {gamesError}
                </p>
              ) : games.length === 0 ? (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(var(--sq-alpha),0.4)' }}>
                  No games found for this week.
                </p>
              ) : (
                <>
                  <div>
                    <FieldLabel>Select matchup</FieldLabel>
                    <div style={{ position: 'relative' }}>
                      <select
                        value={selectedGameId}
                        onChange={(e) => setSelectedGameId(e.target.value)}
                        style={{
                          width: '100%',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '13px',
                          color: 'var(--sq-text)',
                          background: 'var(--sq-surface)',
                          border: '1px solid rgba(var(--sq-alpha),0.1)',
                          borderRadius: '2px',
                          padding: '12px 40px 12px 14px',
                          appearance: 'none',
                          outline: 'none',
                          cursor: 'pointer',
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'rgba(var(--sq-accent-rgb),0.5)'}
                        onBlur={(e) => e.target.style.borderColor = 'rgba(var(--sq-alpha),0.1)'}
                      >
                        {games.map((g) => (
                          <option key={g.id} value={g.id} style={{ background: 'var(--sq-surface)' }}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                      <span style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(var(--sq-accent-rgb),0.5)', pointerEvents: 'none', fontSize: '10px' }}>▼</span>
                    </div>
                  </div>

                  {selectedGame && (
                    <div className="flex items-center justify-center gap-4 py-3 rounded-sm" style={{ background: 'rgba(var(--sq-accent-rgb),0.04)', border: '1px solid rgba(var(--sq-accent-rgb),0.1)' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sq-text)' }}>
                        {selectedGame.awayTeam}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'rgba(var(--sq-accent-rgb),0.5)', letterSpacing: '0.2em' }}>AT</span>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sq-accent)' }}>
                        {selectedGame.homeTeam}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </Section>

          {/* ── BOARD DETAILS ────────────────────────── */}
          <Section label="Board Details" delay="120ms">
            <div className="space-y-4">
              <div>
                <FieldLabel>Board name <span style={{ color: 'rgba(var(--sq-alpha),0.25)' }}>(optional)</span></FieldLabel>
                <StyledInput
                  type="text"
                  placeholder="e.g. Office Pool 2025"
                  value={boardName}
                  onChange={(e) => setBoardName(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Price per square</FieldLabel>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--sq-accent)' }}>$</span>
                  <StyledInput
                    type="number"
                    min="1"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    style={{ paddingLeft: '28px' }}
                  />
                </div>
              </div>

              {/* Rotate numbers toggle */}
              <button
                type="button"
                onClick={() => setRotateNumbers((v) => !v)}
                className="flex items-center gap-3 w-full text-left transition-all"
                style={{ padding: '10px 14px', borderRadius: '2px', background: rotateNumbers ? 'rgba(var(--sq-accent-rgb),0.06)' : 'rgba(var(--sq-alpha),0.02)', border: `1px solid ${rotateNumbers ? 'rgba(var(--sq-accent-rgb),0.2)' : 'rgba(var(--sq-alpha),0.05)'}` }}
              >
                <div style={{
                  width: '20px', height: '20px', borderRadius: '2px', flexShrink: 0,
                  background: rotateNumbers ? '#f59e0b' : 'transparent',
                  border: `1px solid ${rotateNumbers ? '#f59e0b' : 'rgba(var(--sq-alpha),0.2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {rotateNumbers && <span style={{ color: '#07070e', fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.15em', textTransform: 'uppercase', color: rotateNumbers ? 'var(--sq-text)' : 'rgba(var(--sq-alpha),0.3)' }}>
                    Rotate numbers each quarter
                  </span>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', color: rotateNumbers ? 'rgba(var(--sq-accent-rgb),0.5)' : 'rgba(var(--sq-alpha),0.15)', textTransform: 'uppercase', marginTop: '2px' }}>
                    New random numbers assigned per quarter — shown simultaneously on the board
                  </p>
                </div>
              </button>
            </div>
          </Section>

          {/* ── SCORING MOMENTS ──────────────────────── */}
          <Section label="Scoring Moments & Payouts" delay="160ms">
            <div className="space-y-2">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(var(--sq-alpha),0.25)', textTransform: 'uppercase', marginBottom: '12px' }}>
                Toggle each quarter — enter a payout and optional reverse payout
              </p>

              {/* Q1, Q2, Q3 */}
              {QUARTER_MOMENTS.map((m) => (
                <MomentRow key={m} m={m} moments={moments} payouts={payouts} reversePayouts={reversePayouts} toggleMoment={toggleMoment} setPayouts={setPayouts} setReversePayouts={setReversePayouts} />
              ))}

              {/* Q4 / Final — mutually exclusive */}
              <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '2px', background: 'rgba(var(--sq-accent-rgb),0.03)', border: '1px solid rgba(var(--sq-accent-rgb),0.1)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(var(--sq-accent-rgb),0.45)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Pick one — Q4 or Final
                </p>
                <div className="space-y-2">
                  {END_MOMENTS.map((m) => (
                    <MomentRow key={m} m={m} moments={moments} payouts={payouts} reversePayouts={reversePayouts} toggleMoment={toggleMoment} setPayouts={setPayouts} setReversePayouts={setReversePayouts} />
                  ))}
                </div>
              </div>
            </div>
          </Section>

          {/* ── COMMISSIONER ─────────────────────────── */}
          <Section label="Commissioner" delay="200ms">
            <div className="space-y-4">
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(var(--sq-alpha),0.25)', textTransform: 'uppercase' }}>
                Your info as board admin
              </p>
              <div>
                <FieldLabel>Name</FieldLabel>
                <StyledInput
                  type="text"
                  required
                  placeholder="Your full name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <StyledInput
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  disabled={!!user?.email}
                />
              </div>
              <div>
                <FieldLabel>Phone <span style={{ color: 'rgba(var(--sq-alpha),0.25)' }}>(optional)</span></FieldLabel>
                <StyledInput
                  type="tel"
                  placeholder="(555) 000-0000"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                />
              </div>
              <div style={{ padding: '10px 14px', borderRadius: '2px', background: 'rgba(var(--sq-accent-rgb),0.03)', border: '1px solid rgba(var(--sq-accent-rgb),0.1)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.2em', color: 'rgba(var(--sq-accent-rgb),0.45)', textTransform: 'uppercase', marginBottom: '10px' }}>
                  Payment methods — at least one required
                </p>
                <div className="space-y-3">
                  <div>
                    <FieldLabel>Cash App $cashtag <span style={{ color: 'rgba(var(--sq-alpha),0.25)' }}>(without $)</span></FieldLabel>
                    <StyledInput
                      type="text"
                      placeholder="yourcashtag"
                      value={adminCashapp}
                      onChange={(e) => setAdminCashapp(e.target.value.replace(/^\$/, ''))}
                    />
                  </div>
                  <div>
                    <FieldLabel>Venmo username</FieldLabel>
                    <StyledInput
                      type="text"
                      placeholder="your-venmo-username"
                      value={adminVenmo}
                      onChange={(e) => setAdminVenmo(e.target.value.replace(/^@/, ''))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* ── ERROR + SUBMIT ───────────────────────── */}
          <div className="pt-4 space-y-4">
            {error && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-sm" style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" style={{ animation: 'pulse-dot 2s infinite' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#f87171', letterSpacing: '0.05em' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '15px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: submitting ? 'rgba(7,7,14,0.6)' : '#07070e',
                background: submitting ? 'rgba(var(--sq-accent-rgb),0.5)' : '#f59e0b',
                border: 'none',
                padding: '16px 24px',
                borderRadius: '2px',
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
              className={!submitting ? 'hover:bg-[#fbbf24]' : ''}
            >
              {submitting ? 'Creating Board…' : 'Create Board →'}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}

// ── SHARED COMPONENTS ──────────────────────────────────────────────

function Section({ label, children, delay = '0ms' }) {
  return (
    <div className="animate-slide-up py-5" style={{ animationDelay: delay, borderBottom: '1px solid rgba(var(--sq-alpha),0.05)' }}>
      <div className="flex items-center gap-3 mb-4">
        <div style={{ width: '3px', height: '14px', background: 'var(--sq-accent)', borderRadius: '1px', flexShrink: 0 }} />
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.5)' }}>
          {label}
        </span>
      </div>
      {children}
    </div>
  )
}

function FieldLabel({ children }) {
  return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.35)', marginBottom: '8px' }}>
      {children}
    </p>
  )
}

function MomentRow({ m, moments, payouts, reversePayouts, toggleMoment, setPayouts, setReversePayouts }) {
  const active = moments.includes(m)
  return (
    <div className="transition-all" style={{ padding: '10px 14px', borderRadius: '2px', background: active ? 'rgba(var(--sq-accent-rgb),0.06)' : 'rgba(var(--sq-alpha),0.02)', border: `1px solid ${active ? 'rgba(var(--sq-accent-rgb),0.2)' : 'rgba(var(--sq-alpha),0.05)'}` }}>
      {/* Toggle row */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => toggleMoment(m)}
          style={{
            width: '20px', height: '20px', borderRadius: '2px', flexShrink: 0,
            background: active ? '#f59e0b' : 'transparent',
            border: `1px solid ${active ? '#f59e0b' : 'rgba(var(--sq-alpha),0.2)'}`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {active && <span style={{ color: '#07070e', fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
        </button>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.15em', textTransform: 'uppercase', color: active ? 'var(--sq-text)' : 'rgba(var(--sq-alpha),0.3)', minWidth: '52px' }}>
          {m}
        </span>
        {active && (
          <div className="flex items-center gap-2 flex-1">
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'rgba(var(--sq-accent-rgb),0.5)' }}>$</span>
            <input
              type="number"
              min="0"
              placeholder="Payout"
              value={payouts[m]}
              onChange={(e) => setPayouts((p) => ({ ...p, [m]: e.target.value }))}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                color: 'var(--sq-text)',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(var(--sq-alpha),0.1)',
                outline: 'none',
                padding: '2px 4px',
              }}
              onFocus={(e) => e.target.style.borderBottomColor = 'rgba(var(--sq-accent-rgb),0.5)'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(var(--sq-alpha),0.1)'}
            />
          </div>
        )}
      </div>

      {/* Reverse payout row */}
      {active && (
        <div className="flex items-center gap-2 mt-2" style={{ paddingLeft: '32px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(var(--sq-alpha),0.2)', whiteSpace: 'nowrap' }}>
            Reverse $
          </span>
          <input
            type="number"
            min="0"
            placeholder="Reverse payout (optional)"
            value={reversePayouts[m]}
            onChange={(e) => setReversePayouts((p) => ({ ...p, [m]: e.target.value }))}
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: 'rgba(240,237,232,0.7)',
              background: 'transparent',
              border: 'none',
              borderBottom: '1px solid rgba(var(--sq-alpha),0.06)',
              outline: 'none',
              padding: '2px 4px',
            }}
            onFocus={(e) => e.target.style.borderBottomColor = 'rgba(var(--sq-accent-rgb),0.3)'}
            onBlur={(e) => e.target.style.borderBottomColor = 'rgba(var(--sq-alpha),0.06)'}
          />
        </div>
      )}
    </div>
  )
}

function StyledInput({ style = {}, ...props }) {
  return (
    <input
      {...props}
      style={{
        width: '100%',
        fontFamily: 'var(--font-mono)',
        fontSize: '13px',
        color: 'var(--sq-text)',
        background: 'var(--sq-surface)',
        border: '1px solid rgba(var(--sq-alpha),0.08)',
        borderRadius: '2px',
        padding: '11px 14px',
        outline: 'none',
        boxSizing: 'border-box',
        ...style,
      }}
      onFocus={(e) => {
        e.target.style.borderColor = 'rgba(var(--sq-accent-rgb),0.5)'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(var(--sq-alpha),0.08)'
        props.onBlur?.(e)
      }}
    />
  )
}
