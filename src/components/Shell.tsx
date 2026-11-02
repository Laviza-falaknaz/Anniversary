import { useState, type ReactNode } from 'react'
import { href, useRoute } from '../lib/router'
import { useData } from '../lib/store'
import { useSession } from '../lib/session'
import { usePrefs, setPrefs } from '../lib/prefs'
import { startAmbient, stopAmbient, sfx } from '../lib/audio'
import { SITE, nameOf } from '../content/site'
import { Heart } from './Ornaments'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/letters', label: 'Letters', icon: '💌' },
  { to: '/keepsakes', label: 'Keepsakes', icon: '🪶' },
  { to: '/play', label: 'Play', icon: '🎁' },
  { to: '/tonight', label: 'Tonight', icon: '🥂' },
]

export function Shell({ children }: { children: ReactNode }) {
  const route = useRoute()
  const { who, unreadNotes, newActivity, error, refresh } = useData()
  const { logout, switchPerson } = useSession()
  const [menu, setMenu] = useState(false)
  const prefs = usePrefs()
  const active = (to: string) => (to === '/' ? route === '/' : route === to || route.startsWith(to + '/'))
  const badge = (to: string) => (to === '/keepsakes' && unreadNotes > 0 ? unreadNotes : 0)

  const toggleAmbient = () => {
    const on = !prefs.ambient
    setPrefs({ ambient: on })
    if (on) startAmbient(); else stopAmbient() // starts only from this click
  }

  return (
    <div className="min-h-dvh pb-24 md:pb-10">
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[90] focus:rounded-full focus:bg-espresso focus:px-4 focus:py-2 focus:text-ivory">Skip to content</a>
      <header className="sticky top-0 z-30 border-b border-gold/25 bg-ivory/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5">
          <a href={href('/')} className="flex items-center gap-2 rounded-full pr-2 text-espresso" aria-label="Home">
            <Heart size={20} /><span className="serif text-xl leading-none sm:text-2xl">{SITE.title}</span>
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => (
              <a key={n.to} href={href(n.to)} aria-current={active(n.to) ? 'page' : undefined}
                className={`relative rounded-full px-4 py-2 text-sm font-semibold transition ${active(n.to) ? 'bg-espresso text-ivory' : 'text-chocolate hover:bg-cream'}`}>
                {n.label}{badge(n.to) > 0 && <span className="ml-1.5 rounded-full bg-terracotta px-1.5 py-0.5 text-[10px] text-white">{badge(n.to)}</span>}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-1.5">
            <a href={href('/activity')} aria-label={newActivity > 0 ? `Activity, ${newActivity} new` : 'Activity'} title="Activity"
              className={`relative flex h-11 w-11 items-center justify-center rounded-full text-lg transition hover:bg-cream ${active('/activity') ? 'bg-cream' : ''}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4a3126" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
              {newActivity > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-terracotta ring-2 ring-ivory" />}
            </a>
            <button onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-haspopup="true" aria-label="Settings"
              className="flex h-11 w-11 items-center justify-center rounded-full text-lg hover:bg-cream">⚙️</button>
          </div>
        </div>
        {menu && (
          <div className="mx-auto max-w-6xl px-4 pb-3">
            <div className="card anim-pop ml-auto w-full max-w-sm space-y-1 p-3 text-sm" role="group" aria-label="Settings">
              <Toggle label="Sound effects" on={prefs.sfx} onChange={(v) => { setPrefs({ sfx: v }); if (v) sfx.tap() }} />
              <Toggle label="Ambient music" on={prefs.ambient} onChange={toggleAmbient} />
              <Toggle label="Calm motion (fewer animations)" on={prefs.calm} onChange={(v) => setPrefs({ calm: v })} />
              <div className="flex items-center justify-between gap-2 border-t border-gold/25 pt-2">
                <span className="text-chocolate/80">Signed in as <strong>{nameOf(who)}</strong></span>
                <div className="flex gap-1.5">
                  <button className="btn btn-ghost btn-sm" onClick={() => { setMenu(false); switchPerson() }}>Switch</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => logout()}>Log out</button>
                </div>
              </div>
              <p className="pt-1 text-xs text-chocolate/60">Updates arrive within a few seconds.</p>
            </div>
          </div>
        )}
      </header>

      {error && (
        <div role="alert" className="mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-2xl bg-burgundy px-4 py-2.5 text-sm text-ivory">
          <span>{error === 'network' ? "You're offline or the server can't be reached. Showing the last thing we saw." : 'We could not refresh just now.'}</span>
          <button className="rounded-full bg-ivory/15 px-3 py-1 font-semibold" onClick={() => void refresh()}>Retry</button>
        </div>
      )}

      <main id="main" tabIndex={-1} className="mx-auto max-w-6xl px-4 pb-8 pt-6 outline-none md:pt-10">{children}</main>

      <nav aria-label="Main" className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-gold/30 bg-ivory/95 backdrop-blur-md md:hidden">
        <ul className="mx-auto flex max-w-lg justify-around px-1 py-1.5">
          {NAV.map((n) => (
            <li key={n.to}>
              <a href={href(n.to)} aria-current={active(n.to) ? 'page' : undefined}
                className={`relative flex min-h-[52px] min-w-[62px] flex-col items-center justify-center rounded-2xl px-2 text-[11px] font-semibold ${active(n.to) ? 'bg-espresso text-ivory' : 'text-chocolate'}`}>
                <span aria-hidden="true" className="text-lg leading-none">{n.icon}</span>{n.label}
                {badge(n.to) > 0 && <span className="absolute right-1.5 top-1 rounded-full bg-terracotta px-1.5 text-[10px] text-white">{badge(n.to)}</span>}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}

function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button role="switch" aria-checked={on} onClick={() => onChange(!on)} className="flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-2 text-left hover:bg-cream">
      <span>{label}</span>
      <span className={`relative h-6 w-11 rounded-full transition ${on ? 'bg-burgundy' : 'bg-chocolate/25'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} /></span>
    </button>
  )
}
