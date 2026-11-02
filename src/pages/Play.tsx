import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../lib/store'
import { href } from '../lib/router'
import { Btn, Card, Modal, PageTitle, Rich, WhoDot, Empty } from '../components/ui'
import { GiftBox, Heart } from '../components/Ornaments'
import { EnvelopeIcon } from '../components/Ornaments'
import { explain, newId } from '../lib/api'
import { REWARDS, KIND_NOTE, type Reward } from '../content/rewards'
import { OPEN_WHEN, ADVENTURE, ADVENTURE_START } from '../content/bonus'
import { QUIZ } from '../content/quiz'
import { SITE, nameOf } from '../content/site'
import { fmtDateTime } from '../lib/time'
import { sfx } from '../lib/audio'
import { confetti } from '../lib/confetti'
import { isCalm } from '../lib/prefs'

export function Play({ sub }: { sub?: string }) {
  if (sub === 'wheel') return <Sub title="The gift wheel" eyebrow="A fair spin"><Wheel /></Sub>
  if (sub === 'open-when') return <Sub title="Open when…" eyebrow="Little envelopes"><OpenWhen /></Sub>
  if (sub === 'quiz') return <Sub title="Our little quiz" eyebrow="How well do we know us?"><Quiz /></Sub>
  if (sub === 'adventure') return <Sub title="Choose your surprise" eyebrow="A tiny adventure"><Adventure /></Sub>
  const items = [
    { to: '/play/wheel', t: 'Gift wheel', d: 'Spin for a small surprise, a wish, or a treat to share.', i: <GiftBox size={52} /> },
    { to: '/play/open-when', t: 'Open when…', d: 'Six envelopes for six moods.', i: <EnvelopeIcon size={54} /> },
    { to: '/play/quiz', t: 'Our little quiz', d: 'A few questions, a few giggles.', i: <span className="text-4xl">🧩</span> },
    { to: '/play/adventure', t: 'Choose your surprise', d: 'Pick a door. Every path ends somewhere different.', i: <span className="text-4xl">🚪</span> },
  ]
  return (
    <div className="page-enter">
      <PageTitle eyebrow="Play" title="Games & surprises">Nothing here is required. Wander in, wander out.</PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 stagger">
        {items.map((x) => (
          <a key={x.to} href={href(x.to)} className="card group flex items-center gap-5 p-6 transition hover:-translate-y-1 hover:shadow-2xl">
            <div className="transition group-hover:rotate-6">{x.i}</div>
            <div><h2 className="text-3xl text-espresso">{x.t}</h2><p className="text-sm text-chocolate/75">{x.d}</p></div>
          </a>
        ))}
      </div>
    </div>
  )
}

function Sub({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) {
  return (
    <div className="page-enter space-y-6">
      <a href={href('/play')} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-terracotta">← Play</a>
      <PageTitle eyebrow={eyebrow} title={title} />
      {children}
    </div>
  )
}

// ───────────────────────── Gift wheel ─────────────────────────
const TOTAL_W = REWARDS.reduce((n, r) => n + r.weight, 0)
const SLICES = (() => {
  let a = 0
  return REWARDS.map((r) => { const span = (r.weight / TOTAL_W) * 360; const s = { r, start: a, span }; a += span; return s })
})()

const polar = (cx: number, cy: number, rad: number, deg: number) => {
  const t = ((deg - 90) * Math.PI) / 180
  return [cx + rad * Math.cos(t), cy + rad * Math.sin(t)]
}
const arc = (start: number, end: number, rad = 150) => {
  const [x1, y1] = polar(160, 160, rad, start), [x2, y2] = polar(160, 160, rad, end)
  return `M160 160L${x1} ${y1}A${rad} ${rad} 0 ${end - start > 180 ? 1 : 0} 1 ${x2} ${y2}Z`
}

function Wheel() {
  const { data, who, act } = useData()
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [reveal, setReveal] = useState<{ spinId: string; reward: Reward } | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const req = useRef(newId())
  const calm = isCalm()

  const pending = useMemo(() => {
    const s = data?.spins.find((x) => x.participant === who && !x.status)
    const reward = REWARDS.find((r) => r.key === s?.reward_key)
    return s && reward ? { spinId: s.id, reward } : null
  }, [data, who])
  const shown = reveal ?? (!spinning ? pending : null)

  const spin = async () => {
    if (spinning || busy || pending) return
    setBusy(true); setErr(null)
    try {
      const res = await act<{ spin_id: string; reward_key: string }>('spin', { clientRequestId: req.current })
      const slice = SLICES.find((s) => s.r.key === res.reward_key)
      if (!slice) throw new Error('unknown reward')
      const target = slice.start + slice.span * (0.15 + Math.random() * 0.7) // somewhere inside the server-chosen slice
      const base = ((rotation % 360) + 360) % 360
      const delta = ((360 - target - base) % 360 + 360) % 360
      const turns = calm ? 0 : 5
      setSpinning(true)
      setRotation(rotation + 360 * turns + delta)
      if (!calm) { let t = 0, gap = 70; while (t < 5200) { window.setTimeout(() => sfx.tick(), t); t += gap; gap *= 1.075 } }
      window.setTimeout(() => {
        setSpinning(false); setReveal({ spinId: res.spin_id, reward: slice.r }); req.current = newId()
        sfx.success(); confetti({ count: 120 })
      }, calm ? 400 : 5600)
    } catch (e) { setErr(explain(e)) } finally { setBusy(false) }
  }

  const decide = async (status: 'claimed' | 'declined' | 'swapped') => {
    if (!shown) return
    setBusy(true); setErr(null)
    try { await act('resolve_spin', { spinId: shown.spinId, status }); setReveal(null); sfx.tap() } catch (e) { setErr(explain(e)) } finally { setBusy(false) }
  }

  const history = (data?.spins ?? []).slice(0, 12)
  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col items-center">
        <div className="relative w-full max-w-[420px]">
          <div className="absolute left-1/2 top-[-6px] z-10 -translate-x-1/2" aria-hidden="true"><svg width="38" height="46" viewBox="0 0 38 46"><path d="M19 44L3 10a17 17 0 1132 0z" fill="#6b2434" stroke="#e6d2a8" strokeWidth="3" /><circle cx="19" cy="14" r="5" fill="#e6d2a8" /></svg></div>
          <svg viewBox="0 0 320 320" className="w-full drop-shadow-2xl" role="img" aria-label={`Gift wheel with ${REWARDS.length} rewards: ${REWARDS.map((r) => r.label).join(', ')}`}>
            <circle cx="160" cy="160" r="158" fill="#2b1d17" />
            <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '160px 160px', transition: spinning ? `transform ${calm ? 0.3 : 5.4}s cubic-bezier(0.12, 0.65, 0.08, 1)` : 'none' }}>
              {SLICES.map(({ r, start, span }) => {
                const mid = start + span / 2
                const [tx, ty] = polar(160, 160, 100, mid)
                return (
                  <g key={r.key}>
                    <path d={arc(start, start + span)} fill={r.color} stroke="#faf4e8" strokeWidth="2" />
                    <text x={tx} y={ty} textAnchor="middle" dominantBaseline="central" fontSize="26" transform={`rotate(${mid} ${tx} ${ty})`}>{r.emoji}</text>
                  </g>
                )
              })}
            </g>
            <circle cx="160" cy="160" r="26" fill="#faf4e8" stroke="#b98f45" strokeWidth="3" />
            <path d="M160 174s-12-7.500-12-15.500a6.500 6.500 0 0111-4.500 6.500 6.500 0 0111 4.500c0 8-10 15.500-10 15.500z" fill="#6b2434" transform="translate(-1 -3)" />
          </svg>
        </div>
        <Btn className="mt-6 min-w-[200px] !text-lg" onClick={spin} disabled={spinning || busy || !!pending || !!reveal}>
          {spinning ? 'Spinning…' : pending || reveal ? 'Decide on your reward ↓' : 'Spin the wheel'}
        </Btn>
        <p className="mt-2 max-w-xs text-center text-xs text-chocolate/65">The wheel only animates. The result is drawn on the server and saved before it spins. Slice size matches the odds.</p>
        {err && <p role="alert" className="mt-2 text-sm text-burgundy">{err}</p>}
      </div>

      <div className="space-y-5">
        {shown ? (
          <Card className="anim-pop p-6 text-center sm:p-8" >
            <div className="text-6xl" aria-hidden="true">{shown.reward.emoji}</div>
            <p className="eyebrow mt-2">{shown.reward.kind === 'mutual' ? 'An idea to share' : shown.reward.kind === 'wish' ? 'A wish' : 'A surprise'}</p>
            <h2 className="mt-1 text-4xl text-espresso">{shown.reward.label}</h2>
            <p className="mx-auto mt-2 max-w-sm text-chocolate/85">{shown.reward.description}</p>
            <p className="mx-auto mt-3 max-w-sm rounded-xl bg-champagne/40 p-2.5 text-sm text-chocolate">{KIND_NOTE[shown.reward.kind]} No pressure, ever. You can pass on it or swap it for a new spin.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Btn onClick={() => decide('claimed')} disabled={busy}>Save it 💝</Btn>
              <Btn variant="ghost" onClick={() => decide('swapped')} disabled={busy}>Swap it (spin again)</Btn>
              <Btn variant="ghost" onClick={() => decide('declined')} disabled={busy}>Not today</Btn>
            </div>
          </Card>
        ) : (
          <Card className="p-6"><h2 className="text-3xl text-espresso">What's on the wheel</h2>
            <ul className="mt-3 grid gap-1.5 text-sm text-chocolate/85">{REWARDS.map((r) => <li key={r.key}><span aria-hidden="true">{r.emoji}</span> <strong>{r.label}</strong> · <span className="text-chocolate/65">{r.kind === 'mutual' ? 'if you both fancy it' : r.kind === 'wish' ? 'a wish' : 'a surprise'}</span></li>)}</ul>
          </Card>
        )}

        <Card className="p-5">
          <h2 className="text-2xl text-espresso">Spin history</h2>
          {history.length === 0 ? <p className="mt-2 text-sm text-chocolate/70">No spins yet.</p> : (
            <ul className="mt-3 divide-y divide-gold/20">
              {history.map((s) => { const r = REWARDS.find((x) => x.key === s.reward_key); return (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span><span aria-hidden="true">{r?.emoji}</span> {r?.label ?? s.reward_key} · <WhoDot w={s.participant} /></span>
                  <span className="text-right text-xs text-chocolate/65">{s.status ? `${s.status}${s.decided_by ? ` by ${nameOf(s.decided_by)}` : ''}` : 'deciding…'}<br />{fmtDateTime(Date.parse(s.spun_at), SITE.timezone)}</span>
                </li>) })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  )
}

// ───────────────────────── Open when ─────────────────────────
function OpenWhen() {
  const { data, who, act } = useData()
  const [open, setOpen] = useState<string | null>(null)
  const done = new Set((data?.activity ?? []).filter((a) => a.participant === who && a.event_type === 'open_when_opened').map((a) => a.detail))
  const item = OPEN_WHEN.find((o) => o.key === open)
  const choose = (k: string) => { setOpen(k); sfx.paper(); void act('log_event', { kind: 'open_when_opened', key: k }).catch(() => undefined) }
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
        {OPEN_WHEN.map((o) => (
          <button key={o.key} onClick={() => choose(o.key)} className="card group p-6 text-center transition hover:-translate-y-1 hover:shadow-2xl">
            <EnvelopeIcon className="mx-auto transition group-hover:scale-110" size={72} open={done.has(o.key)} />
            <h2 className="mt-3 text-2xl leading-tight text-espresso">{o.title}</h2>
            <p className="mt-1 text-xs text-chocolate/60">{done.has(o.key) ? 'Opened before. Read it again' : 'Sealed'}</p>
          </button>
        ))}
      </div>
      <Modal open={!!item} onClose={() => setOpen(null)} label={item?.title ?? ''}>
        {item && (
          <article className="card letter-paper p-7 sm:p-9">
            <p className="eyebrow">{item.title}</p>
            <p className="letter-text mt-4">{item.message}</p>
            <Btn className="mt-6" onClick={() => setOpen(null)}>Close</Btn>
          </article>
        )}
      </Modal>
    </>
  )
}

// ───────────────────────── Quiz ─────────────────────────
function Quiz() {
  const { data, act } = useData()
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const req = useRef(newId())
  const submitted = useRef(false)
  const q = QUIZ[i]

  useEffect(() => {
    if (!finished || submitted.current) return
    submitted.current = true
    void act('submit_quiz', { score, total: QUIZ.length, clientRequestId: req.current }).catch((e) => { setErr(explain(e)); submitted.current = false })
    sfx.success(); confetti({ count: 80 })
  }, [finished, score, act])

  const pick = (k: string) => {
    if (picked) return
    setPicked(k)
    if (k === q.correct) { setScore((s) => s + 1); sfx.chime() } else sfx.wrong()
  }
  const next = () => { if (i + 1 >= QUIZ.length) setFinished(true); else { setI(i + 1); setPicked(null) } }
  const again = () => { setI(0); setPicked(null); setScore(0); setFinished(false); submitted.current = false; req.current = newId() }
  const past = data?.quiz ?? []

  if (finished) {
    const msg = score === QUIZ.length ? 'Perfect. You know us by heart.' : score >= QUIZ.length / 2 ? 'Very nicely done. We make a good team.' : 'Honestly? Cute. We have lots more to learn about each other.'
    return (
      <div className="space-y-5">
        <Card className="anim-pop p-8 text-center">
          <p className="eyebrow">Final reveal</p>
          <p className="serif mt-2 text-8xl text-burgundy">{score}<span className="text-4xl text-chocolate/50"> / {QUIZ.length}</span></p>
          <p className="mt-2 text-xl text-chocolate serif italic">{msg}</p>
          {err && <p role="alert" className="mt-2 text-sm text-burgundy">{err}</p>}
          <Btn className="mt-5" variant="ghost" onClick={again}>Play again</Btn>
        </Card>
        <PastScores rows={past} />
      </div>
    )
  }
  return (
    <div className="space-y-5">
      <div aria-label={`Question ${i + 1} of ${QUIZ.length}`} className="h-2 overflow-hidden rounded-full bg-sand"><div className="h-full rounded-full bg-burgundy transition-all duration-500" style={{ width: `${((i + (picked ? 1 : 0)) / QUIZ.length) * 100}%` }} /></div>
      <Card className="p-6 sm:p-8" key={q.key}>
        <p className="eyebrow">Question {i + 1} of {QUIZ.length} {q.placeholder && SITE.showPlaceholderBadges && <span className="chip ml-2">placeholder</span>}</p>
        <h2 className="mt-2 text-3xl leading-tight text-espresso sm:text-4xl"><Rich text={q.question} /></h2>
        <div className="mt-5 grid gap-2.5" role="group" aria-label="Answers">
          {q.options.map((o) => {
            const state = !picked ? '' : o.key === q.correct ? 'border-emerald-700/60 bg-emerald-50' : o.key === picked ? 'border-burgundy/60 bg-rose/20 anim-shake' : 'opacity-60'
            return (
              <button key={o.key} onClick={() => pick(o.key)} disabled={!!picked} aria-pressed={picked === o.key}
                className={`min-h-[52px] rounded-2xl border-2 border-chocolate/15 bg-white/70 px-4 py-3 text-left text-lg transition hover:bg-white disabled:cursor-default ${state}`}>
                <Rich text={o.text} />
              </button>
            )
          })}
        </div>
        {picked && (
          <div className="anim-fade-up mt-5" role="status">
            <p className="serif text-xl text-chocolate"><strong>{picked === q.correct ? 'Yes! ' : 'Not quite. '}</strong><Rich text={q.reveal} /></p>
            <Btn className="mt-3" onClick={next}>{i + 1 >= QUIZ.length ? 'See my score' : 'Next question'}</Btn>
          </div>
        )}
      </Card>
    </div>
  )
}

function PastScores({ rows }: { rows: { id: string; participant: 'laviza' | 'ahmed'; score: number; total: number; completed_at: string }[] }) {
  if (!rows.length) return <Empty title="No scores recorded yet" />
  return (
    <Card className="p-5"><h2 className="text-2xl text-espresso">Scores so far</h2>
      <ul className="mt-2 divide-y divide-gold/20">{rows.map((r) => <li key={r.id} className="flex justify-between py-2 text-sm"><WhoDot w={r.participant} /><span>{r.score}/{r.total} · {fmtDateTime(Date.parse(r.completed_at), SITE.timezone)}</span></li>)}</ul>
    </Card>
  )
}

// ───────────────────────── Adventure ─────────────────────────
function Adventure() {
  const { act } = useData()
  const [id, setId] = useState(ADVENTURE_START)
  const [trail, setTrail] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const node = ADVENTURE.find((n) => n.id === id)!
  const go = (next: string) => {
    sfx.tap(); setTrail((t) => [...t, id]); setId(next); setSaved(false)
    const n = ADVENTURE.find((x) => x.id === next)
    if (n?.ending) { sfx.chime(); confetti({ count: 50 }); void act('log_event', { kind: 'adventure_finished', key: next }).catch(() => undefined) }
  }
  const saveWish = async () => {
    if (!node.ending) return
    try { await act('add_wish', { category: 'date', body: `${node.ending.title}: ${node.ending.idea}`.slice(0, 300), clientRequestId: newId() }); setSaved(true) } catch (e) { setErr(explain(e)) }
  }
  return (
    <Card className="mx-auto max-w-2xl p-6 sm:p-9">
      {node.ending ? (
        <div className="anim-pop text-center">
          <Heart size={34} className="mx-auto" />
          <p className="eyebrow mt-2">An ending</p>
          <h2 className="mt-1 text-4xl text-espresso">{node.ending.title}</h2>
          <p className="mx-auto mt-3 max-w-md text-xl serif italic text-chocolate">{node.ending.message}</p>
          <p className="mx-auto mt-4 max-w-md rounded-xl bg-champagne/40 p-3 text-chocolate"><strong>An idea:</strong> {node.ending.idea}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Btn onClick={saveWish} disabled={saved}>{saved ? 'Saved to the wish jar ✓' : 'Save to the wish jar'}</Btn>
            <Btn variant="ghost" onClick={() => { setId(ADVENTURE_START); setTrail([]); setSaved(false) }}>Try another path</Btn>
          </div>
          {err && <p role="alert" className="mt-2 text-sm text-burgundy">{err}</p>}
        </div>
      ) : (
        <div key={node.id} className="anim-fade-up">
          <p className="eyebrow">Step {trail.length + 1}</p>
          <p className="mt-2 text-2xl leading-snug serif text-espresso sm:text-3xl">{node.text}</p>
          <div className="mt-6 grid gap-2.5">
            {node.choices!.map((c) => <button key={c.next} onClick={() => go(c.next)} className="min-h-[52px] rounded-2xl border-2 border-chocolate/15 bg-white/70 px-4 py-3 text-left text-lg transition hover:-translate-y-0.5 hover:bg-white">{c.label}</button>)}
          </div>
          {trail.length > 0 && <Btn size="sm" variant="ghost" className="mt-5" onClick={() => { setId(trail[trail.length - 1]); setTrail((t) => t.slice(0, -1)) }}>← Back</Btn>}
        </div>
      )}
    </Card>
  )
}
