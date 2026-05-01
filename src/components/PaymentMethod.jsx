/**
 * PaymentMethod — shows a branded payment link + collapsible QR code.
 *
 * Props:
 *   platform  – 'cashapp' | 'venmo'
 *   handle    – the recipient's handle (without $ for cashapp)
 *   amount    – numeric dollar amount
 *   note      – payment memo string
 *   verb      – 'Pay' (player paying admin) | 'Send' (admin paying winner) — default 'Pay'
 */
const CONFIG = {
  cashapp: {
    label: 'Cash App',
    bg: 'rgba(0,214,50,0.12)',
    border: 'rgba(0,214,50,0.3)',
    color: '#00D632',
    buildUrl: (handle, amount) => `https://cash.app/$${handle}/${amount}`,
  },
  venmo: {
    label: 'Venmo',
    bg: 'rgba(61,149,206,0.12)',
    border: 'rgba(61,149,206,0.3)',
    color: '#3D95CE',
    buildUrl: (handle, amount, note) =>
      `https://venmo.com/${handle}?txn=pay&amount=${amount}&note=${encodeURIComponent(note ?? '')}`,
  },
}

export default function PaymentMethod({ platform, handle, amount, note, verb = 'Pay' }) {
  const cfg = CONFIG[platform]
  if (!cfg || !handle) return null

  const url = cfg.buildUrl(handle, amount, note)
  const displayHandle = platform === 'cashapp' ? `$${handle}` : `@${handle}`

  return (
    <button
      onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
      className="inline-flex items-center gap-2 px-3 py-2 rounded font-semibold text-xs transition-opacity hover:opacity-80"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
    >
      <span>{verb} ${amount} via {cfg.label}</span>
      <span className="opacity-60 font-normal">{displayHandle}</span>
    </button>
  )
}
