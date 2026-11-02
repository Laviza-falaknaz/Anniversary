import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { SITE } from '../content/site'

export function Btn({ variant = 'primary', size, className = '', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'gold' | 'ghost'; size?: 'sm' }) {
  return <button type="button" {...p} className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} />
}

export function Card({ children, className = '', dark = false }: { children: ReactNode; className?: string; dark?: boolean }) {
  return <div className={`${dark ? 'card-dark' : 'card'} ${className}`}>{children}</div>
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-6 md:mb-8">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-4xl md:text-5xl leading-[1.05] text-espresso">{title}</h1>
      {children && <p className="mt-3 max-w-2xl text-chocolate/80">{children}</p>}
    </header>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-16 text-chocolate/70">
      <svg className="animate-spin" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" fill="none" opacity=".25" /><path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
      <span>{label}…</span>
    </div>
  )
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-wrap items-center justify-between gap-3 border-burgundy/30 p-4 text-burgundy">
      <span>{message}</span>
      {onRetry && <Btn size="sm" variant="ghost" onClick={onRetry}>Try again</Btn>}
    </div>
  )
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="serif text-2xl text-espresso">{title}</p>
      {children && <p className="mx-auto mt-2 max-w-md text-chocolate/75">{children}</p>}
    </div>
  )
}

/** Renders text, highlighting [[ADD: …]] placeholders so unfinished spots are easy to see. */
export function Rich({ text }: { text: string }) {
  const parts = text.split(/(\[\[[^\]]*\]\])/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[[') && p.endsWith(']]')
          ? SITE.showPlaceholderBadges
            ? <mark key={i} className="placeholder-chip">{p.slice(2, -2)}</mark>
            : null
          : <span key={i}>{p}</span>,
      )}
    </>
  )
}

export function Modal({ open, onClose, label, children, wide }: { open: boolean; onClose: () => void; label: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])')
        if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    ref.current?.focus()
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev?.focus?.() }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-espresso/70 backdrop-blur-sm sm:items-center sm:p-6" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
        className={`anim-pop max-h-[94dvh] w-full overflow-y-auto rounded-t-[28px] outline-none sm:rounded-[28px] ${wide ? 'sm:max-w-3xl' : 'sm:max-w-xl'}`}>
        {children}
      </div>
    </div>
  )
}

export function who(w: 'laviza' | 'ahmed') { return SITE.people[w].name }

export function WhoDot({ w }: { w: 'laviza' | 'ahmed' }) {
  return <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: SITE.people[w].color }}><span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: SITE.people[w].color }} />{SITE.people[w].name}</span>
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; badge?: number }[]; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={value === o.value} onClick={() => onChange(o.value)}
          className={`relative shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${value === o.value ? 'bg-espresso text-ivory shadow' : 'bg-white/60 text-chocolate hover:bg-white'}`}>
          {o.label}
          {!!o.badge && <span className="ml-1.5 rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] text-white">{o.badge}</span>}
        </button>
      ))}
    </div>
  )
}
