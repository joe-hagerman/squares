import React, { useState } from 'react'
import QuickShareModal from './QuickShareModal'
import LockIcon from './LockIcon'

export default function FloatingMenu({ boardId, isLocked }) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)

  const items = [
    { key: 'invite', icon: <IconInvite />, label: 'Invite', onClick: isLocked ? undefined : () => setInviteOpen(true), locked: isLocked, lockMessage: 'Board is locked — squares are no longer available to claim.' },
    { key: 'share', icon: <IconShare />, label: 'Share', onClick: () => setShareOpen(true) },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 45,
        padding: '0 1rem calc(1rem + env(safe-area-inset-bottom))',
      }}
    >
      <div
        style={{
          maxWidth: '24rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '9999px',
          background: 'var(--sq-pill-bg)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid var(--sq-pill-border)',
          boxShadow: 'var(--sq-pill-shadow)',
        }}
      >
        {items.map((item, i) => (
          <React.Fragment key={item.key}>
            {i > 0 && (
              <div style={{ width: '1px', alignSelf: 'stretch', background: 'var(--sq-pill-divider)', margin: '10px 0' }} />
            )}
            <MenuButton icon={item.icon} label={item.label} onClick={item.onClick} locked={item.locked} lockMessage={item.lockMessage} />
          </React.Fragment>
        ))}
      </div>

      {inviteOpen && (
        <QuickShareModal
          mode="invite"
          boardId={boardId}
          isLocked={isLocked}
          onClose={() => setInviteOpen(false)}
        />
      )}
      {shareOpen && (
        <QuickShareModal
          mode="share"
          boardId={boardId}
          isLocked={isLocked}
          onClose={() => setShareOpen(false)}
        />
      )}
    </div>
  )
}

function MenuButton({ icon, label, onClick, locked, lockMessage }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  const active = !locked && (hovered || pressed)

  return (
    <button
      onClick={locked ? undefined : onClick}
      className={locked ? 'relative group/lock' : 'relative'}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        minHeight: '56px',
        padding: '10px 8px',
        background: active ? 'rgba(245,158,11,0.07)' : 'transparent',
        border: 'none',
        cursor: locked ? 'not-allowed' : onClick ? 'pointer' : 'default',
        color: locked ? 'var(--sq-pill-text-lock)' : active ? 'var(--sq-accent)' : 'var(--sq-pill-text)',
        transform: pressed && !locked ? 'scale(0.93)' : 'scale(1)',
        transition: 'color 0.15s, background 0.15s, transform 0.1s',
        WebkitTapHighlightColor: 'transparent',
      }}
      onMouseEnter={() => { if (!locked) setHovered(true) }}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => { if (!locked) setPressed(true) }}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => { if (!locked) setPressed(true) }}
      onTouchEnd={() => setPressed(false)}
    >
      <span style={{ display: 'flex', transition: 'inherit' }}>{icon}</span>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '0.15em',
        textTransform: 'uppercase',
        transition: 'inherit',
      }}>
        {label}
      </span>
      {locked && (
        <>
          <LockIcon width={9} height={9} style={{ position: 'absolute', top: '8px', right: '10px', opacity: 0.4 }} />
          {lockMessage && (
            <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 rounded-sm px-2.5 py-2 font-mono text-[10px] leading-relaxed opacity-0 group-hover/lock:opacity-100 group-focus/lock:opacity-100 transition-opacity z-50 whitespace-normal text-center"
              style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.7)' }}>
              {lockMessage}
            </span>
          )}
        </>
      )}
    </button>
  )
}

function IconInvite() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
