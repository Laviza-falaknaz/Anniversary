import { isCalm } from './prefs'

const COLORS = ['#b98f45', '#e6d2a8', '#c98f8a', '#6b2434', '#b0583a', '#faf4e8']

/** A short burst of paper confetti. Skipped entirely when calm / reduced motion is on. */
export function confetti(opts: { count?: number; origin?: { x: number; y: number } } = {}) {
  if (isCalm()) return
  const canvas = document.createElement('canvas')
  canvas.setAttribute('aria-hidden', 'true')
  Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', zIndex: '80' })
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = window.innerWidth * dpr; canvas.height = window.innerHeight * dpr
  document.body.appendChild(canvas)
  const g = canvas.getContext('2d'); if (!g) { canvas.remove(); return }
  g.scale(dpr, dpr)
  const o = opts.origin ?? { x: 0.5, y: 0.45 }
  const n = opts.count ?? 90
  const ps = Array.from({ length: n }, () => {
    const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9
    return { x: o.x * window.innerWidth, y: o.y * window.innerHeight, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 5, w: 5 + Math.random() * 6, h: 3 + Math.random() * 5,
      r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COLORS[Math.floor(Math.random() * COLORS.length)] }
  })
  let frame = 0
  const step = () => {
    g.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (const p of ps) {
      p.vy += 0.22; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - frame / 150)
      g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore()
    }
    if (++frame < 150) requestAnimationFrame(step); else canvas.remove()
  }
  requestAnimationFrame(step)
}
