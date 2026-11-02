import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Cat, type CatMood } from '../components/Cat'
import { Garland, Heart } from '../components/Ornaments'
import { Btn } from '../components/ui'
import { ApiError, explain } from '../lib/api'
import { CONFIG } from '../lib/config'
import { confetti } from '../lib/confetti'
import { sfx } from '../lib/audio'
import { useSession } from '../lib/session'
import { SITE, type Who } from '../content/site'

const OOPS = [
  "Hmm, not quite. Think whiskers and mischief.",
  "Close, but the guard isn't buying it. Try again?",
  "Nope! The folded ears twitched, so that wasn't it.",
  "Still no. Hint: who sleeps on your side of the bed?",
  "The guard yawned. That's not the name.",
]

export function Gate() {
  const { authed, who, login, identify, notice } = useSession()
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [tries, setTries] = useState(0)
  const [mood, setMood] = useState<CatMood>('idle')
  const [shake, setShake] = useState(false)
  const [look, setLook] = useState({ x: 0, y: 0 })
  const [leaving, setLeaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => { input.current?.focus() }, [])

  const onMove = (e: React.PointerEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setLook({ x: Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2)), y: Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2)) })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!pw.trim() || busy) return
    setBusy(true); setMsg(null)
    try {
      await login(pw)
      setMood('happy'); sfx.success(); confetti({ origin: { x: 0.5, y: 0.35 } })
      setLeaving(true)
      await new Promise((r) => setTimeout(r, 650))
    } catch (err) {
      setMood('oops'); setShake(true); sfx.wrong()
      window.setTimeout(() => { setShake(false); setMood('idle') }, 900)
      if (err instanceof ApiError && err.code === 'wrong_password') {
        setMsg(OOPS[tries % OOPS.length]); setTries((t) => t + 1)
      } else if (err instanceof ApiError && err.code === 'rate_limited') {
        const s = Number(err.extra.retryAfter ?? 60)
        setMsg(`Too many guesses. The guard needs a nap: try again in about ${Math.ceil(s / 60)} min.`)
      } else setMsg(explain(err))
    } finally { setBusy(false) }
  }

  if (authed && !who) return <WhoPicker onPick={identify} />

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-10" onPointerMove={onMove}>
      <Garland />
      <div className={`relative w-full text-center transition-all duration-500 ${leaving ? 'scale-95 opacity-0' : 'anim-fade-up'}`}>
        <p className="eyebrow">{SITE.anniversaryNumber === 1 ? 'Our first anniversary' : 'Our anniversary'}</p>
        <div className={`mx-auto -mb-2 mt-2 w-[min(78vw,320px)] ${shake ? 'anim-shake' : ''}`}>
          <Cat mood={mood} look={look} />
        </div>
        <h1 className="text-balance text-4xl leading-tight text-espresso md:text-5xl">Our Little World</h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-lg italic text-chocolate/85 serif">
          Your way into our little world is guarded by a familiar pair of folded ears.
        </p>

        <form onSubmit={submit} className="card mx-auto mt-7 max-w-sm p-5 text-left" noValidate>
          <label htmlFor="pw" className="mb-1.5 block text-sm font-semibold text-chocolate">Whisper the guard's name</label>
          <div className="relative">
            <input ref={input} id="pw" name="password" className="field pr-20" type={show ? 'text' : 'password'} value={pw}
              onChange={(e) => setPw(e.target.value)} autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
              aria-describedby="pw-msg" aria-invalid={!!msg} placeholder="Who is on duty?" maxLength={100} />
            <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-sm font-semibold text-terracotta hover:bg-cream">
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <p id="pw-msg" role="status" aria-live="polite" className={`mt-2 min-h-[1.5rem] text-sm ${msg ? 'text-burgundy' : 'text-chocolate/60'}`}>
            {msg ?? notice ?? 'Hint: they have very small ears and very big opinions.'}
          </p>
          <Btn type="submit" className="mt-2 w-full" disabled={busy || !pw.trim()}>
            {busy ? 'Checking…' : 'Come in'} <Heart size={16} fill="#fff6ea" />
          </Btn>
        </form>
        {!CONFIG.configured && (
          <p role="alert" className="mx-auto mt-4 max-w-sm rounded-xl bg-champagne/60 p-3 text-sm text-chocolate">
            This copy isn't connected to its backend yet (missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY), so signing in is disabled. See the README.
          </p>
        )}
      </div>
    </main>
  )
}

function WhoPicker({ onPick }: { onPick: (w: Who) => Promise<void> }) {
  const [busy, setBusy] = useState<Who | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const pick = async (w: Who) => {
    setBusy(w); setErr(null); sfx.chime()
    try { await onPick(w) } catch (e) { setErr(explain(e)); setBusy(null) }
  }
  return (
    <main className="relative mx-auto flex min-h-dvh max-w-2xl flex-col items-center justify-center px-5 py-10 text-center">
      <Garland />
      <div className="relative anim-fade-up">
        <p className="eyebrow">You're in</p>
        <h1 className="mt-2 text-4xl text-espresso md:text-5xl">Who's opening the gift?</h1>
        <p className="mx-auto mt-3 max-w-md text-chocolate/80">This is how your letters, notes and choices are signed. It's a simple pick (no accounts), so it works on the honour system.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 stagger">
          {(['ahmed', 'laviza'] as Who[]).map((w) => (
            <button key={w} onClick={() => pick(w)} disabled={busy !== null} autoFocus={w === 'ahmed'}
              className={`card group p-8 text-left transition hover:-translate-y-1 hover:shadow-2xl disabled:opacity-60 ${w === 'ahmed' ? 'ring-2 ring-gold sm:scale-105' : 'opacity-90'}`}>
              <span className="script text-3xl" style={{ color: SITE.people[w].color }}>{w === 'ahmed' ? "I'm" : "I'm"}</span>
              <span className="serif block text-5xl text-espresso">{SITE.people[w].name}</span>
              <span className="mt-3 block text-sm text-chocolate/70">{busy === w ? 'One moment…' : w === 'ahmed' ? 'Open my anniversary gift' : 'See how Ahmed is getting on'}</span>
            </button>
          ))}
        </div>
        {err && <p role="alert" className="mt-4 text-burgundy">{err}</p>}
      </div>
    </main>
  )
}
