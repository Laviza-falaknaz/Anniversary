import type { CSSProperties } from 'react'

type P = { className?: string; style?: CSSProperties; size?: number }

export function Flower({ className, style, size = 64 }: P) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <g transform="translate(32 32)">
        {[0, 72, 144, 216, 288].map((r) => (
          <ellipse key={r} rx="9" ry="16" cy="-14" transform={`rotate(${r})`} fill="#ecd0c6" stroke="#c98f8a" strokeWidth="1.2" />
        ))}
        <circle r="7" fill="#e6d2a8" stroke="#b98f45" strokeWidth="1.2" />
      </g>
    </svg>
  )
}

export function Sparkle({ className, style, size = 20 }: P) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1l2.2 8.8L23 12l-8.8 2.2L12 23l-2.2-8.8L1 12l8.8-2.2z" fill="#d6b56a" />
    </svg>
  )
}

export function Heart({ className, style, size = 20, fill = '#6b2434' }: P & { fill?: string }) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s-8-5.2-8-11a4.6 4.6 0 018-3 4.6 4.6 0 018 3c0 5.800-8 11-8 11z" fill={fill} />
    </svg>
  )
}

export function Ribbon({ className, style, size = 80 }: P) {
  return (
    <svg className={className} style={style} width={size} height={size * 0.6} viewBox="0 0 100 60" aria-hidden="true">
      <path d="M50 30C38 6 6 8 10 28c3 14 28 8 40 2z" fill="#a4543c" />
      <path d="M50 30C62 6 94 8 90 28c-3 14-28 8-40 2z" fill="#b8664a" />
      <path d="M46 32L30 58l12-6 6 8 4-24zM54 32l16 26-12-6-6 8-4-24z" fill="#8c3f2b" />
      <circle cx="50" cy="30" r="7" fill="#c9a45c" />
    </svg>
  )
}

export function GiftBox({ className, style, size = 64 }: P) {
  return (
    <svg className={className} style={style} width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="8" y="26" width="48" height="32" rx="4" fill="#6b2434" />
      <rect x="5" y="18" width="54" height="12" rx="4" fill="#85303f" />
      <rect x="29" y="18" width="6" height="40" fill="#e6d2a8" />
      <path d="M32 18c-8-12-20-8-16-2 3 4 12 2 16 2zM32 18c8-12 20-8 16-2-3 4-12 2-16 2z" fill="#c9a45c" />
    </svg>
  )
}

export function EnvelopeIcon({ className, size = 40, open = false }: P & { open?: boolean }) {
  return (
    <svg className={className} width={size} height={size * 0.75} viewBox="0 0 64 48" aria-hidden="true">
      <rect x="2" y="6" width="60" height="40" rx="4" fill="#f2e7d3" stroke="#b98f45" strokeWidth="1.6" />
      {open
        ? <path d="M2 10l30-8 30 8" fill="#e7d6b9" stroke="#b98f45" strokeWidth="1.6" />
        : <path d="M2 8l30 22L62 8" fill="#e7d6b9" stroke="#b98f45" strokeWidth="1.6" />}
      {!open && <circle cx="32" cy="28" r="5" fill="#6b2434" />}
    </svg>
  )
}

/** Soft floating decorations for hero areas. Purely decorative; never intercepts clicks. */
export function Garland({ className = '' }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      <Flower size={90} className="absolute -left-6 top-6 opacity-70 anim-floaty" style={{ ['--r' as string]: '-8deg' }} />
      <Flower size={60} className="absolute right-4 top-24 opacity-60 anim-floaty" style={{ animationDelay: '1.5s' }} />
      <Sparkle className="absolute left-1/4 top-10 twinkle" size={16} />
      <Sparkle className="absolute right-1/3 top-4 twinkle" size={12} style={{ animationDelay: '1s' }} />
      <Sparkle className="absolute right-10 bottom-10 twinkle" size={18} style={{ animationDelay: '2s' }} />
    </div>
  )
}
