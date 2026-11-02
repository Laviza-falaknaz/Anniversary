import { countdownParts } from '../lib/time'
import { useNow } from '../lib/store'

const pad = (n: number) => String(n).padStart(2, '0')

export function Countdown({ target, className = '' }: { target: number; className?: string }) {
  const now = useNow(1000)
  const { total, h, m, s } = countdownParts(target, now)
  const label = total === 0 ? 'any moment now' : `${h ? `${h} hour${h > 1 ? 's' : ''}, ` : ''}${m} minute${m === 1 ? '' : 's'}`
  return (
    <div role="timer" aria-label={`Opens in ${label}`} className={`serif tabular-nums ${className}`}>
      <span aria-hidden="true">{pad(h)}<span className="mx-0.5 opacity-50">:</span>{pad(m)}<span className="mx-0.5 opacity-50">:</span>{pad(s)}</span>
    </div>
  )
}
