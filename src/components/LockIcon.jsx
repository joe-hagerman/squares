export default function LockIcon({ width = 10, height = 10, style = {} }) {
  return (
    <svg width={width} height={height} viewBox="0 0 10 10" fill="none" style={style}>
      <rect x="2" y="4.5" width="6" height="5" rx="0.75" fill="currentColor" />
      <path d="M3.5 4.5V3a1.5 1.5 0 0 1 3 0v1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
    </svg>
  )
}
