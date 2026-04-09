import { getTeamLogoUrl } from '../lib/nfl'

/**
 * TeamBanner — comic-book styled team label for grid axes.
 * orientation: 'horizontal' (home, across top) | 'vertical' (away, down left side)
 */
const SCANLINES = {
  position: 'absolute', inset: 0, pointerEvents: 'none',
  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(var(--sq-alpha),0.03) 3px, rgba(var(--sq-alpha),0.03) 4px)',
  zIndex: 1,
}
const LOGO_FILTER = 'contrast(1.5) saturate(2) drop-shadow(0 0 4px rgba(var(--sq-accent-rgb),0.4))'

export default function TeamBanner({ teamName, orientation = 'horizontal' }) {
  const logoUrl = getTeamLogoUrl(teamName)
  const isVertical = orientation === 'vertical'

  if (isVertical) {
    return (
      <div style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background: 'var(--sq-banner-bg)',
        border: '1px solid rgba(var(--sq-accent-rgb),0.25)',
        borderRadius: '3px',
        gap: '6px',
        padding: '8px 2px',
        height: '100%',
      }}>
        <div style={SCANLINES} />

        {/* Amber top accent bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: 'var(--sq-accent)', zIndex: 3 }} />

        {/* Logo — top, rotated */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt={teamName}
            style={{
              width: '22px', height: '22px',
              objectFit: 'contain',
              filter: LOGO_FILTER,
              transform: 'rotate(-90deg)',
              position: 'relative', zIndex: 4,
              flexShrink: 0,
            }}
          />
        )}

        {/* Team name — vertical */}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: '11px',
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          color: 'var(--sq-banner-text)',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          position: 'relative', zIndex: 4,
          lineHeight: 1,
        }}>
          {teamName}
        </span>

        {/* Logo — bottom, rotated */}
        {logoUrl && (
          <img
            src={logoUrl}
            alt={teamName}
            style={{
              width: '22px', height: '22px',
              objectFit: 'contain',
              filter: LOGO_FILTER,
              transform: 'rotate(-90deg)',
              position: 'relative', zIndex: 4,
              flexShrink: 0,
            }}
          />
        )}
      </div>
    )
  }

  // Horizontal
  return (
    <div style={{
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      overflow: 'hidden',
      background: 'var(--sq-banner-bg)',
      border: '1px solid rgba(var(--sq-accent-rgb),0.25)',
      borderRadius: '3px',
      padding: '4px 10px',
      height: '100%',
    }}>
      <div style={SCANLINES} />

      {/* Left amber accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '2px', background: 'var(--sq-accent)', zIndex: 3 }} />

      {logoUrl && (
        <img
          src={logoUrl}
          alt={teamName}
          style={{
            width: '28px', height: '28px',
            objectFit: 'contain',
            filter: LOGO_FILTER,
            position: 'relative', zIndex: 4,
            flexShrink: 0,
          }}
        />
      )}

      <span style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 700,
        fontSize: '13px',
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        color: 'var(--sq-banner-text)',
        whiteSpace: 'nowrap',
        position: 'relative', zIndex: 4,
        lineHeight: 1,
      }}>
        {teamName}
      </span>

      {logoUrl && (
        <img
          src={logoUrl}
          alt={teamName}
          style={{
            width: '28px', height: '28px',
            objectFit: 'contain',
            filter: LOGO_FILTER,
            position: 'relative', zIndex: 4,
            flexShrink: 0,
          }}
        />
      )}
    </div>
  )
}
