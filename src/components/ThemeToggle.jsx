import { useState } from 'react'
import { getTheme, toggleTheme } from '../lib/theme'

export default function ThemeToggle({ inline = false }) {
  const [theme, setThemeState] = useState(getTheme)

  function handleToggle() {
    const next = theme === 'dark' ? 'light' : 'dark'
    toggleTheme()
    setThemeState(next)
  }

  const size = inline ? 28 : 40
  const iconSize = inline ? 13 : 16

  return (
    <button
      onClick={handleToggle}
      style={{
        ...(inline ? {} : {
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top) + 1rem)',
          right: '1rem',
          zIndex: 50,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '4px',
        background: 'var(--sq-surface)',
        border: '1px solid rgba(var(--sq-alpha), 0.12)',
        color: 'var(--sq-text)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        WebkitTapHighlightColor: 'transparent',
      }}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
