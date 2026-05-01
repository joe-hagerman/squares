import { useState, useRef, useEffect } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import LockIcon from './LockIcon'

export default function QuickShareModal({ mode = 'share', boardId, isLocked, onClose }) {
  const origin = window.location.origin
  const joinUrl = `${origin}/board/${boardId}/join`
  const liveUrl = `${origin}/board/${boardId}`
  const url = mode === 'invite' ? joinUrl : liveUrl
  const title = mode === 'invite' ? 'Invite Players' : 'Quick Share'

  const [copiedMain, setCopiedMain] = useState(false)
  const [copyError, setCopyError] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const copyTimeoutRef = useRef(null)

  useEffect(() => {
    return () => clearTimeout(copyTimeoutRef.current)
  }, [])

  async function copyMainLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedMain(true)
      setCopyError(false)
      copyTimeoutRef.current = setTimeout(() => setCopiedMain(false), 2000)
    } catch {
      setCopyError(true)
      copyTimeoutRef.current = setTimeout(() => setCopyError(false), 2000)
    }
  }

  function shareViaSms() {
    const text = mode === 'invite'
      ? `Claim your squares in this football pool: ${url}`
      : `Watch the football squares board live: ${url}`
    window.open(`sms:?body=${encodeURIComponent(text)}`)
  }

  function shareViaEmail() {
    const subject = encodeURIComponent('Football Squares')
    const body = encodeURIComponent(
      mode === 'invite'
        ? `Join the football squares pool and claim your squares: ${url}`
        : `Watch the board live here: ${url}`
    )
    window.open(`mailto:?subject=${subject}&body=${body}`)
  }

  function shareViaFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 48,
          background: 'rgba(7,7,14,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          animation: 'qs-fade-in 0.2s ease',
        }}
      />

      {/* Sheet */}
      <div
        className="qs-sheet"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 49,
          background: 'var(--sq-surface)',
          borderTop: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '16px 16px 0 0',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'qs-slide-up 0.28s cubic-bezier(0.32,0.72,0,1)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 20px 16px',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '18px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--sq-text)',
          }}>
            {title}
          </span>
          <CloseButton onClick={onClose} />
        </div>

        <div style={{ padding: '0 16px 24px' }}>
          {/* Share grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            marginBottom: '10px',
          }}>
            {mode === 'invite' ? (
              <>
                <ShareTile icon={<IconInviteLink />} label="Invite Link" onClick={copyMainLink} copied={copiedMain} copyError={copyError} />
                <ShareTile icon={<IconFacebook />} label="Facebook" onClick={shareViaFacebook} />
                <ShareTile icon={<IconSms />} label="Text / SMS" onClick={shareViaSms} />
                <ShareTile icon={<IconEmail />} label="Email" onClick={shareViaEmail} />
                <ShareTile icon={<IconQR />} label="QR Code" onClick={() => setShowQR(v => !v)} active={showQR} />
              </>
            ) : (
              <>
                <ShareTile icon={<IconLiveLink />} label="Live Board Link" onClick={copyMainLink} copied={copiedMain} copyError={copyError} />
                <ShareTile icon={<IconFacebook />} label="Facebook" onClick={shareViaFacebook} />
                <ShareTile icon={<IconSms />} label="Text / SMS" onClick={shareViaSms} />
                <ShareTile icon={<IconEmail />} label="Email" onClick={shareViaEmail} />
                <ShareTile icon={<IconQR />} label="QR Code" onClick={() => setShowQR(v => !v)} active={showQR} />
                <ShareTile
                  icon={<IconPrint />}
                  label="Print Board"
                  onClick={isLocked ? () => window.open(`/board/${boardId}/print`, '_blank') : undefined}
                  locked={!isLocked}
                  lockMessage="All squares must be claimed and paid before being able to print."
                />
              </>
            )}
          </div>

          {/* QR expand */}
          {showQR && (
            <div style={{
              marginBottom: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              padding: '20px',
              borderRadius: '12px',
              background: 'rgba(var(--sq-alpha),0.03)',
              border: '1px solid rgba(var(--sq-alpha),0.07)',
              animation: 'qs-fade-in 0.2s ease',
            }}>
              <QRCodeCanvas
                value={url}
                size={160}
                bgColor="transparent"
                fgColor={document.documentElement.dataset.theme === 'light' ? '#141020' : '#f0ede8'}
                level="M"
              />
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'rgba(var(--sq-alpha),0.45)',
                letterSpacing: '0.05em',
                textAlign: 'center',
              }}>
                Scan to {mode === 'invite' ? 'join the board' : 'watch live'}
              </span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes qs-slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes qs-slide-up-desktop {
          from { transform: translateX(-50%) translateY(100%); }
          to { transform: translateX(-50%) translateY(0); }
        }
        @keyframes qs-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (min-width: 640px) {
          .qs-sheet {
            left: 50% !important;
            right: auto !important;
            transform: translateX(-50%);
            width: 575px !important;
            border-radius: 16px !important;
            bottom: 24px !important;
            border: 1px solid rgba(245,158,11,0.2) !important;
            animation: qs-slide-up-desktop 0.28s cubic-bezier(0.32,0.72,0,1) !important;
          }
        }
      `}</style>
    </>
  )
}

function CloseButton({ onClick }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      aria-label="Close"
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '28px', height: '28px',
        borderRadius: '50%',
        background: hovered ? 'rgba(var(--sq-alpha),0.14)' : 'rgba(var(--sq-alpha),0.08)',
        border: 'none', cursor: 'pointer',
        color: 'rgba(var(--sq-alpha),0.6)',
        fontSize: '14px', lineHeight: 1,
        transition: 'background 0.15s',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      ✕
    </button>
  )
}

function ShareTile({ icon, label, onClick, active, copied, copyError, locked, lockMessage }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const isHot = !locked && !active && !copied && !copyError && (hovered || pressed)

  const bg = locked ? 'rgba(var(--sq-alpha),0.02)'
    : copyError ? 'rgba(220,38,38,0.08)'
    : copied ? 'rgba(16,185,129,0.12)'
    : active || isHot ? 'rgba(245,158,11,0.1)'
    : 'rgba(var(--sq-alpha),0.03)'
  const borderColor = locked ? 'rgba(var(--sq-alpha),0.04)'
    : copyError ? 'rgba(220,38,38,0.25)'
    : copied ? 'rgba(16,185,129,0.3)'
    : active || isHot ? 'rgba(245,158,11,0.25)'
    : 'rgba(var(--sq-alpha),0.07)'
  const color = locked ? 'rgba(var(--sq-alpha),0.2)'
    : copyError ? '#f87171'
    : copied ? '#10b981'
    : active || isHot ? 'var(--sq-accent)'
    : 'var(--sq-text)'

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={`relative ${locked ? 'group/lock cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: '8px',
        padding: '16px 8px',
        borderRadius: '12px',
        background: bg,
        border: `1px solid ${borderColor}`,
        color,
        transform: pressed && !locked ? 'scale(0.96)' : 'scale(1)',
        transition: 'all 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={() => { if (!locked) setHovered(true) }}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => { if (!locked) setPressed(true) }}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => { if (!locked) setPressed(true) }}
      onTouchEnd={() => setPressed(false)}
    >
      <span style={{ display: 'flex' }}>{copyError ? <IconX /> : copied ? <IconCheck /> : icon}</span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        {copyError ? 'Failed' : copied ? 'Copied' : label}
      </span>
      {locked && (
        <>
          <LockIcon width={10} height={10} style={{ position: 'absolute', top: '8px', right: '8px', opacity: 0.4 }} />
          {lockMessage && (
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 rounded-sm px-2.5 py-2 font-mono text-[10px] leading-relaxed opacity-0 group-hover/lock:opacity-100 group-focus/lock:opacity-100 transition-opacity z-50 whitespace-normal text-center"
              style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.7)' }}>
              {lockMessage}
            </span>
          )}
        </>
      )}
    </button>
  )
}

function IconCheck() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconInviteLink() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconLiveLink() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2a10 10 0 0 1 0 20A10 10 0 0 1 12 2" />
      <path d="M2 12h4M18 12h4" />
      <path d="M12 2v4M12 18v4" />
    </svg>
  )
}

function IconFacebook() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function IconSms() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="10" x2="9" y2="10" strokeWidth="2.5" />
      <line x1="12" y1="10" x2="12" y2="10" strokeWidth="2.5" />
      <line x1="15" y1="10" x2="15" y2="10" strokeWidth="2.5" />
    </svg>
  )
}

function IconEmail() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconPrint() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function IconQR() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="5" y="5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="16" y="5" width="3" height="3" fill="currentColor" stroke="none" />
      <rect x="5" y="16" width="3" height="3" fill="currentColor" stroke="none" />
      <path d="M14 14h3v3h-3z" fill="currentColor" stroke="none" />
      <path d="M17 17h4" />
      <path d="M17 14v7" />
      <path d="M14 17h3" />
    </svg>
  )
}
