import { useEffect, useMemo, useState } from 'react'
import { useData } from '../lib/store'
import { Btn, Card, PageTitle, WhoDot } from '../components/ui'
import { Heart, Sparkle } from '../components/Ornaments'
import { explain } from '../lib/api'
import { CATEGORY_TITLES, CONVERSATION_CARDS, PLANNER_OPTIONS, optionByKey, type PlannerCategory } from '../content/planner'
import { SITE, nameOf, other, type Who } from '../content/site'
import { fmtLongDate, fmtTime, zonedToEpoch } from '../lib/time'
import { sfx } from '../lib/audio'
import { confetti } from '../lib/confetti'
import type { PlanRow } from '../lib/types'

const CATS: PlannerCategory[] = ['mood', 'activity', 'cuisine', 'extra']

export function Tonight() {
  const { data, who, act } = useData()
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<PlanRow | 'new' | null>(null)

  const prefs = useMemo(() => {
    const m = new Map<string, Set<Who>>()
    for (const p of data?.preferences ?? []) { if (!m.has(p.option_key)) m.set(p.option_key, new Set()); m.get(p.option_key)!.add(p.participant) }
    return m
  }, [data])
  if (!data) return null
  const confirmed = data.plans.find((p) => p.status === 'confirmed') ?? null
  const proposal = data.plans.find((p) => p.status === 'proposed') ?? null
  const mutual = PLANNER_OPTIONS.filter((o) => prefs.get(o.key)?.has('laviza') && prefs.get(o.key)?.has('ahmed'))

  const toggle = async (key: string) => {
    setBusy(key); setErr(null)
    try { const on = !prefs.get(key)?.has(who); await act('set_preference', { optionKey: key, liked: on }); if (on) sfx.tap() } catch (e) { setErr(explain(e)) } finally { setBusy(null) }
  }
  const confirm = async (p: PlanRow) => {
    setBusy('confirm'); setErr(null)
    try { await act('confirm_plan', { planId: p.id }); sfx.success(); confetti({ count: 100 }) } catch (e) { setErr(explain(e)) } finally { setBusy(null) }
  }

  return (
    <div className="page-enter space-y-8">
      <PageTitle eyebrow={fmtLongDate(Date.parse(data.now), SITE.timezone)} title="Tonight, together">
        Heart what you'd love, see what you both love, then turn it into a plan. A plan only counts once <em>both</em> of us have said yes.
      </PageTitle>
      {err && <p role="alert" className="rounded-xl bg-burgundy/10 p-3 text-burgundy">{err}</p>}

      {/* status */}
      {confirmed && !editing && <Itinerary plan={confirmed} onChange={() => setEditing(confirmed)} pendingChange={proposal} />}
      {proposal && !editing && (
        <Card className="p-5 sm:p-6 ring-2 ring-gold/60">
          <p className="eyebrow">{confirmed ? 'A change is proposed' : 'A plan is proposed'}</p>
          <div className="mt-2"><PlanBody plan={proposal} /></div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <ConfirmStatus plan={proposal} />
            {!proposal.confirmed_by.includes(who)
              ? <Btn onClick={() => confirm(proposal)} disabled={busy === 'confirm'}>Yes, let's do this 💝</Btn>
              : <span className="text-sm text-chocolate/75">Waiting for {nameOf(other(who))} to confirm. Changed your mind? Propose a different plan.</span>}
            <Btn variant="ghost" onClick={() => setEditing(proposal)}>Suggest a change</Btn>
          </div>
        </Card>
      )}
      {!confirmed && !proposal && !editing && (
        <Card dark className="flex flex-wrap items-center justify-between gap-3 p-6"><div><p className="eyebrow !text-champagne">Not decided yet</p><p className="serif text-2xl">Nothing is planned for tonight.</p></div><Btn variant="gold" onClick={() => setEditing('new')}>Propose a plan</Btn></Card>
      )}

      {editing && <Composer base={editing === 'new' ? null : editing} mutualKeys={mutual.map((m) => m.key)} onDone={() => setEditing(null)} />}

      {/* favourites */}
      <section aria-label="Shared favourites">
        <h2 className="text-3xl text-espresso">Things we both love</h2>
        {mutual.length === 0 ? <p className="mt-1 text-chocolate/75">Nothing in common yet. Heart a few options below and check back as the other person does too.</p> : (
          <div className="mt-3 flex flex-wrap gap-2">{mutual.map((o) => <span key={o.key} className="chip anim-pop !text-sm !normal-case !tracking-normal"><Sparkle size={12} /> {o.emoji} {o.label}</span>)}</div>
        )}
      </section>

      {CATS.map((c) => (
        <section key={c} aria-labelledby={`h-${c}`}>
          <div className="mb-3 flex items-end justify-between gap-3"><h2 id={`h-${c}`} className="text-3xl text-espresso">{CATEGORY_TITLES[c].title}</h2><p className="text-sm text-chocolate/65">{CATEGORY_TITLES[c].hint}</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PLANNER_OPTIONS.filter((o) => o.category === c).map((o) => {
              const likes = prefs.get(o.key) ?? new Set<Who>()
              const mine = likes.has(who), both = likes.size === 2
              return (
                <div key={o.key} className={`card flex items-start gap-3 p-4 transition ${both ? 'ring-2 ring-gold' : ''}`}>
                  <span className="text-3xl" aria-hidden="true">{o.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="serif text-xl leading-tight text-espresso">{o.label}</p>
                    <p className="text-sm text-chocolate/70">{o.description}</p>
                    <p className="mt-1.5 text-xs text-chocolate/70" aria-live="polite">
                      {both ? <strong className="text-terracotta">You both love this ✨</strong> : likes.size === 1 ? `${nameOf([...likes][0])} likes this` : 'No hearts yet'}
                    </p>
                  </div>
                  <button onClick={() => toggle(o.key)} disabled={busy === o.key} aria-pressed={mine} aria-label={`${mine ? 'Remove heart from' : 'Heart'} ${o.label}`}
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition active:scale-90 ${mine ? 'border-burgundy bg-burgundy/10' : 'border-chocolate/20 bg-white/70 hover:bg-white'}`}>
                    <Heart size={24} fill={mine ? '#6b2434' : 'none'} className={mine ? '' : '[&_path]:stroke-chocolate [&_path]:stroke-[1.5]'} />
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}

      <CardDeck />
    </div>
  )
}

function ConfirmStatus({ plan }: { plan: PlanRow }) {
  return <span className="flex items-center gap-3 text-sm">{(['laviza', 'ahmed'] as Who[]).map((w) => <span key={w} className={plan.confirmed_by.includes(w) ? 'font-semibold text-emerald-800' : 'text-chocolate/60'}>{plan.confirmed_by.includes(w) ? '✓' : '○'} {nameOf(w)}</span>)}</span>
}

function PlanBody({ plan }: { plan: PlanRow }) {
  const opts = plan.option_keys.map(optionByKey).filter(Boolean) as NonNullable<ReturnType<typeof optionByKey>>[]
  const by = (c: PlannerCategory) => opts.filter((o) => o.category === c)
  return (
    <div className="space-y-2">
      <p className="serif text-3xl text-espresso">{fmtTime(Date.parse(plan.starts_at), SITE.timezone)}<span className="text-xl text-chocolate/70"> · {fmtLongDate(Date.parse(plan.starts_at), SITE.timezone)}</span></p>
      <p className="text-sm text-chocolate/75">Proposed by <WhoDot w={plan.proposed_by} /></p>
      <ul className="mt-1 space-y-1 text-lg">{CATS.flatMap((c) => by(c)).map((o) => <li key={o.key}><span aria-hidden="true">{o.emoji}</span> {o.label}</li>)}</ul>
      {plan.location && <p>📍 {plan.location}</p>}
      {plan.notes && <p className="whitespace-pre-wrap text-chocolate/85">📝 {plan.notes}</p>}
      {plan.playlist_url && <p>🎶 <a className="font-semibold text-burgundy underline" href={plan.playlist_url} target="_blank" rel="noopener noreferrer">Our playlist</a></p>}
    </div>
  )
}

function Itinerary({ plan, onChange, pendingChange }: { plan: PlanRow; onChange: () => void; pendingChange: PlanRow | null }) {
  const opts = plan.option_keys.map(optionByKey).filter(Boolean) as NonNullable<ReturnType<typeof optionByKey>>[]
  const start = Date.parse(plan.starts_at)
  const steps = [
    ...opts.filter((o) => o.category === 'mood').map((o) => ({ o, head: 'The mood' })),
    ...opts.filter((o) => o.category === 'activity').map((o) => ({ o, head: 'Together' })),
    ...opts.filter((o) => o.category === 'cuisine').map((o) => ({ o, head: 'To eat' })),
    ...opts.filter((o) => o.category === 'extra').map((o) => ({ o, head: 'Little extra' })),
  ]
  return (
    <Card dark className="relative overflow-hidden p-6 sm:p-9">
      <Sparkle className="absolute right-6 top-6 twinkle" size={26} />
      <p className="eyebrow !text-champagne">Confirmed by both of you 🥂</p>
      <h2 className="mt-2 text-5xl leading-none text-ivory sm:text-6xl">Tonight at <span className="italic text-champagne">{fmtTime(start, SITE.timezone)}</span></h2>
      <p className="mt-2 text-champagne/85">{fmtLongDate(start, SITE.timezone)}{plan.location ? ` · ${plan.location}` : ''}</p>
      <ol className="relative mt-6 space-y-4 border-l border-champagne/40 pl-6">
        {steps.map(({ o, head }, i) => (
          <li key={o.key} className="relative">
            <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-champagne text-[9px] font-bold text-espresso">{i + 1}</span>
            <p className="eyebrow !text-champagne/70">{head}</p>
            <p className="serif text-2xl text-ivory"><span aria-hidden="true">{o.emoji}</span> {o.label}</p>
          </li>
        ))}
      </ol>
      {plan.notes && <p className="mt-5 whitespace-pre-wrap rounded-xl bg-ivory/10 p-3 text-ivory/90">{plan.notes}</p>}
      {plan.playlist_url && <p className="mt-3">🎶 <a className="font-semibold text-champagne underline" href={plan.playlist_url} target="_blank" rel="noopener noreferrer">Open our playlist</a></p>}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Btn variant="gold" onClick={onChange}>{pendingChange ? 'Propose another change' : 'Change the plan'}</Btn>
        <span className="text-xs text-champagne/70">A change needs both of you to confirm again; this plan stays until then.</span>
      </div>
    </Card>
  )
}

function Composer({ base, mutualKeys, onDone }: { base: PlanRow | null; mutualKeys: string[]; onDone: () => void }) {
  const { act } = useData()
  const initialTime = base ? fmtTime24(Date.parse(base.starts_at)) : '19:30'
  const [keys, setKeys] = useState<string[]>(base ? base.option_keys : mutualKeys)
  const [time, setTime] = useState(initialTime)
  const [location, setLocation] = useState(base?.location ?? '')
  const [notes, setNotes] = useState(base?.notes ?? '')
  const [playlist, setPlaylist] = useState(base?.playlist_url ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => { document.getElementById('composer')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }, [])

  const flip = (k: string) => setKeys((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]))
  const submit = async () => {
    setErr(null)
    if (keys.length === 0) return setErr('Pick at least one thing for the evening.')
    if (!/^\d{2}:\d{2}$/.test(time)) return setErr('Choose a start time.')
    if (playlist.trim() && !/^https?:\/\//i.test(playlist.trim())) return setErr('Playlist links must start with http:// or https://')
    setBusy(true)
    try {
      const startsAt = new Date(zonedToEpoch(SITE.anniversaryDate, time, SITE.timezone)).toISOString()
      await act('propose_plan', { optionKeys: keys, startsAt, location: location.trim() || null, notes: notes.trim() || null, playlistUrl: playlist.trim() || null })
      sfx.chime(); onDone()
    } catch (e) { setErr(explain(e)) } finally { setBusy(false) }
  }

  return (
    <Card className="p-5 sm:p-7" >
      <div id="composer" />
      <h2 className="text-3xl text-espresso">{base ? 'Change the plan' : 'Propose a plan'}</h2>
      <p className="mt-1 text-sm text-chocolate/75">This sends a proposal. Your partner still has to confirm it. {mutualKeys.length ? 'We pre-ticked things you both love.' : ''}</p>
      {CATS.map((c) => (
        <fieldset key={c} className="mt-4"><legend className="eyebrow mb-2">{CATEGORY_TITLES[c].title}</legend>
          <div className="flex flex-wrap gap-2">
            {PLANNER_OPTIONS.filter((o) => o.category === c).map((o) => (
              <label key={o.key} className={`cursor-pointer rounded-full border px-3 py-2 text-sm font-semibold transition focus-within:outline focus-within:outline-2 focus-within:outline-gold ${keys.includes(o.key) ? 'border-burgundy bg-burgundy text-ivory' : 'border-chocolate/20 bg-white/70'}`}>
                <input type="checkbox" className="sr-only" checked={keys.includes(o.key)} onChange={() => flip(o.key)} />{o.emoji} {o.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label htmlFor="t" className="mb-1 block text-sm font-semibold">Start time (tonight)</label><input id="t" type="time" className="field" value={time} onChange={(e) => setTime(e.target.value)} /></div>
        <div><label htmlFor="loc" className="mb-1 block text-sm font-semibold">Where (optional)</label><input id="loc" className="field" maxLength={120} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Home, a café, a viewpoint…" /></div>
        <div className="sm:col-span-2"><label htmlFor="pl" className="mb-1 block text-sm font-semibold">Playlist link (optional)</label><input id="pl" type="url" className="field" maxLength={300} value={playlist} onChange={(e) => setPlaylist(e.target.value)} placeholder="https://…" /></div>
        <div className="sm:col-span-2"><label htmlFor="nt" className="mb-1 block text-sm font-semibold">Notes (optional)</label><textarea id="nt" className="field min-h-[80px]" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dress code, bring-a-surprise, whatever matters" /></div>
      </div>
      {err && <p role="alert" className="mt-3 text-burgundy">{err}</p>}
      <div className="mt-5 flex flex-wrap gap-2"><Btn onClick={submit} disabled={busy}>{busy ? 'Sending…' : base ? 'Send the change' : 'Send proposal'}</Btn><Btn variant="ghost" onClick={onDone}>Cancel</Btn></div>
    </Card>
  )
}

const fmtTime24 = (ms: number) => new Intl.DateTimeFormat('en-GB', { timeZone: SITE.timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms)

function CardDeck() {
  const [i, setI] = useState<number | null>(null)
  const draw = () => { sfx.paper(); setI((cur) => { let n; do { n = Math.floor(Math.random() * CONVERSATION_CARDS.length) } while (n === cur && CONVERSATION_CARDS.length > 1); return n }) }
  return (
    <section aria-labelledby="deck">
      <h2 id="deck" className="text-3xl text-espresso">Question cards</h2>
      <p className="text-sm text-chocolate/70">For a slow conversation over dessert. Draw one, answer honestly, then pass it over.</p>
      <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <button onClick={draw} className="card-dark flex aspect-[3/2] w-full max-w-sm items-center justify-center p-6 text-center transition hover:-translate-y-1 active:scale-[0.98]" aria-live="polite">
          {i === null ? <span className="serif text-3xl text-champagne">Tap to draw a card</span> : <span key={i} className="serif anim-pop text-2xl leading-snug text-ivory">{CONVERSATION_CARDS[i]}</span>}
        </button>
        {i !== null && <Btn variant="ghost" onClick={draw}>Draw another</Btn>}
      </div>
    </section>
  )
}
