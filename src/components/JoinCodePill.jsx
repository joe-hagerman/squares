import { useState } from 'react'

export default function JoinCodePill({ code }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  return (
    <div className="relative group/pill">
      <button
        onClick={handleCopy}
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          letterSpacing: '0.22em',
          color: copied ? '#10b981' : 'var(--sq-accent)',
          background: copied ? 'rgba(16,185,129,0.08)' : 'rgba(var(--sq-accent-rgb),0.08)',
          border: `1px solid ${copied ? 'rgba(16,185,129,0.25)' : 'rgba(var(--sq-accent-rgb),0.2)'}`,
          padding: '3px 10px',
          borderRadius: '2px',
          cursor: 'pointer',
          transition: 'all 0.15s',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <span style={{ fontSize: '9px', opacity: 0.6, letterSpacing: '0.15em' }}>JOIN</span>
        <span>{copied ? 'COPIED' : code}</span>
      </button>
      {!copied && (
        <span
          className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-sm px-2.5 py-2 font-mono text-[10px] leading-relaxed opacity-0 group-hover/pill:opacity-100 transition-opacity z-50 whitespace-nowrap"
          style={{ background: 'var(--sq-tooltip)', border: '1px solid rgba(var(--sq-alpha),0.12)', color: 'rgba(var(--sq-alpha),0.7)' }}
        >
          Click to copy join code
        </span>
      )}
    </div>
  )
}
