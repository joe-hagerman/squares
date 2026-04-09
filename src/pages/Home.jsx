import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getBoardByJoinCode } from '../lib/board'

export default function Home() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()

  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState(null)
  const [joinLoading, setJoinLoading] = useState(false)

  async function handleJoin(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    setJoinLoading(true)
    setJoinError(null)
    const boardId = await getBoardByJoinCode(joinCode.trim())
    setJoinLoading(false)
    if (!boardId) {
      setJoinError('Board not found. Check the code and try again.')
      return
    }
    navigate(`/board/${boardId}/join`)
  }

  return (
    <div className="min-h-screen dot-grid text-white flex flex-col" style={{ background: 'var(--sq-bg)' }}>

      {/* Faint grid lines — field texture */}
      <div aria-hidden style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(var(--sq-accent-rgb),0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(var(--sq-accent-rgb),0.03) 1px, transparent 1px)
        `,
        backgroundSize: '10% 10%',
      }} />

      {/* Top amber rule */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent 0%, #f59e0b 30%, #f59e0b 70%, transparent 100%)', position: 'relative', zIndex: 1 }} />

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16" style={{ position: 'relative', zIndex: 1 }}>

        {/* Brand mark */}
        <div className="animate-slide-up mb-6 flex items-center gap-3">
          <div style={{ height: '1px', width: '40px', background: 'rgba(var(--sq-accent-rgb),0.4)' }} />
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.3em',
            color: 'rgba(var(--sq-accent-rgb),0.6)',
            textTransform: 'uppercase',
          }}>Est. Game Day</span>
          <div style={{ height: '1px', width: '40px', background: 'rgba(var(--sq-accent-rgb),0.4)' }} />
        </div>

        {/* Hero type */}
        <div className="animate-slide-up text-center mb-2" style={{ animationDelay: '60ms' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(4rem, 18vw, 10rem)',
            lineHeight: 0.88,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            color: 'var(--sq-text)',
            textShadow: '0 0 80px rgba(var(--sq-accent-rgb),0.08)',
          }}>
            FOOTBALL
          </div>
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(4rem, 18vw, 10rem)',
              lineHeight: 0.88,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              color: 'transparent',
              WebkitTextStroke: '2px #f59e0b',
              textShadow: 'none',
            }}>
              SQUARES
            </div>
          </div>
        </div>

        {/* Diamond divider */}
        <div className="animate-slide-up my-8 flex items-center gap-4" style={{ animationDelay: '120ms' }}>
          <div style={{ height: '1px', width: '60px', background: 'linear-gradient(90deg, transparent, rgba(var(--sq-accent-rgb),0.3))' }} />
          <span style={{ color: 'var(--sq-accent)', fontSize: '12px' }}>◆</span>
          <span style={{ color: 'rgba(var(--sq-accent-rgb),0.4)', fontSize: '8px' }}>◆</span>
          <span style={{ color: 'rgba(var(--sq-accent-rgb),0.2)', fontSize: '6px' }}>◆</span>
          <div style={{ height: '1px', width: '60px', background: 'linear-gradient(90deg, rgba(var(--sq-accent-rgb),0.3), transparent)' }} />
        </div>

        {/* Tagline */}
        <p className="animate-slide-up text-center mb-10" style={{
          animationDelay: '180ms',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          letterSpacing: '0.18em',
          color: 'rgba(var(--sq-alpha),0.35)',
          textTransform: 'uppercase',
        }}>
          Run your own pool — in minutes
        </p>

        {/* CTAs */}
        <div className="animate-slide-up w-full max-w-xs space-y-3" style={{ animationDelay: '240ms' }}>
          <button
            onClick={() => navigate('/create')}
            className="w-full transition-all"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '15px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: '#07070e',
              background: '#f59e0b',
              border: 'none',
              padding: '16px 24px',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#fbbf24'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f59e0b'}
          >
            Create a Board
          </button>

          <button
            onClick={() => navigate('/boards')}
            className="w-full transition-all"
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: '13px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(var(--sq-alpha),0.45)',
              background: 'transparent',
              border: '1px solid rgba(var(--sq-alpha),0.1)',
              padding: '14px 24px',
              borderRadius: '2px',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--sq-accent)'; e.currentTarget.style.borderColor = 'rgba(var(--sq-accent-rgb),0.3)' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(var(--sq-alpha),0.45)'; e.currentTarget.style.borderColor = 'rgba(var(--sq-alpha),0.1)' }}
          >
            My Boards
          </button>

          <div style={{ height: '1px', background: 'rgba(var(--sq-accent-rgb),0.1)', margin: '4px 0' }} />

          <form onSubmit={handleJoin} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Join code"
              maxLength={6}
              style={{
                flex: 1,
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'var(--sq-text)',
                background: 'rgba(var(--sq-alpha),0.04)',
                border: '1px solid rgba(var(--sq-alpha),0.12)',
                padding: '14px 16px',
                borderRadius: '2px',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={joinLoading || !joinCode.trim()}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: joinLoading || !joinCode.trim() ? 'rgba(var(--sq-alpha),0.3)' : '#07070e',
                background: joinLoading || !joinCode.trim() ? 'rgba(var(--sq-alpha),0.06)' : '#f59e0b',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '2px',
                cursor: joinLoading || !joinCode.trim() ? 'default' : 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              {joinLoading ? '…' : 'Join'}
            </button>
          </form>
          {joinError && (
            <p style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.08em',
              color: '#f87171',
              textAlign: 'center',
              marginTop: '-4px',
            }}>
              {joinError}
            </p>
          )}

          {user && (
            <button
              onClick={async () => { await signOut(); navigate('/') }}
              className="w-full transition-all"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                color: 'rgba(var(--sq-alpha),0.45)',
                background: 'transparent',
                border: 'none',
                padding: '8px 24px',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'rgba(var(--sq-alpha),0.7)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(var(--sq-alpha),0.45)'}
            >
              Sign out
            </button>
          )}

        </div>

        {/* Feature strip */}
        <div className="animate-slide-up mt-16 flex items-center gap-6 flex-wrap justify-center" style={{ animationDelay: '300ms' }}>
          <FeatureTag>10 × 10 Grid</FeatureTag>
          <span style={{ color: 'rgba(var(--sq-accent-rgb),0.25)', fontSize: '8px' }}>◆</span>
          <FeatureTag>Real-Time</FeatureTag>
          <span style={{ color: 'rgba(var(--sq-accent-rgb),0.25)', fontSize: '8px' }}>◆</span>
          <FeatureTag>Custom Payouts</FeatureTag>
        </div>
      </div>

      {/* Bottom amber rule */}
      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(var(--sq-accent-rgb),0.2) 50%, transparent 100%)', position: 'relative', zIndex: 1 }} />

      {/* Footer */}
      <div className="animate-slide-up py-4 text-center" style={{ position: 'relative', zIndex: 1, animationDelay: '360ms' }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '9px',
          letterSpacing: '0.25em',
          color: 'rgba(var(--sq-alpha),0.15)',
          textTransform: 'uppercase',
        }}>
          Squares · Game Day Edition
        </span>
      </div>
    </div>
  )
}

function FeatureTag({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '9px',
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'rgba(var(--sq-alpha),0.25)',
    }}>
      {children}
    </span>
  )
}
