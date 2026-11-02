import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../lib/store'
import { navigate } from '../lib/router'
import { Btn, Card, Empty, PageTitle, Rich, Segmented, WhoDot } from '../components/ui'
import { Flower } from '../components/Ornaments'
import { explain, newId } from '../lib/api'
import { fmtDateTime } from '../lib/time'
import { SITE, nameOf, other, type Who } from '../content/site'
import { MEMORIES } from '../content/memories'
import { BADGES } from '../content/badges'
import { sfx } from '../lib/audio'
import { confetti } from '../lib/confetti'
import type { WishRow } from '../lib/types'

type Tab = 'notes' | 'wishes' | 'memories' | 'badges'
const TABS: Tab[] = ['notes', 'wishes', 'memories', 'badges']

export function Keepsakes({ tab }: { tab?: string }) {
  const { unreadNotes } = useData()
  const current: Tab = (TABS as string[]).includes(tab ?? '') ? (tab as Tab) : 'notes'
  return (
    <div className="page-enter space-y-6">
      <PageTitle eyebrow="Keepsakes" title="Little things to keep">Notes, wishes, memories and the badges you've earned along the way.</PageTitle>
      <Segmented<Tab> label="Keepsakes" value={current} onChange={(t) => navigate(`/keepsakes/${t}`)} options={[
        { value: 'notes', label: 'Notes', badge: unreadNotes || undefined }, { value: 'wishes', label: 'Wish jar' },
        { value: 'memories', label: 'Memory lane' }, { value: 'badges', label: 'Badges' }]} />
      {current === 'notes' && <Notes />}
      {current === 'wishes' && <Wishes />}
      {current === 'memories' && <Memories />}
      {current === 'badges' && <Badges />}
    </div>
  )
}

function Notes() {
  const { data, who, act, markSeen } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const req = useRef(newId())
  const seenAtEntry = useRef<number | null>(null)
  if (data && seenAtEntry.current === null) seenAtEntry.current = Date.parse(data.seen.notes_seen_at)
  useEffect(() => { const t = window.setTimeout(() => void markSeen('notes'), 1500); return () => window.clearTimeout(t) }, [markSeen])
  if (!data) return null
  const letterOf = (id: string | null) => data.letters.find((l) => l.id === id)

  const send = async () => {
    if (!text.trim() || busy) return
    setBusy(true); setErr(null)
    try { await act('post_note', { body: text, clientRequestId: req.current }); setText(''); req.current = newId(); sfx.success(); confetti({ count: 24, origin: { x: 0.5, y: 0.2 } }) }
    catch (e) { setErr(explain(e)) } finally { setBusy(false) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <Card className="letter-paper h-fit p-5 sm:p-7">
        <p className="script text-3xl text-terracotta">Dear {nameOf(other(who))},</p>
        <label htmlFor="note" className="sr-only">Write a love note</label>
        <textarea id="note" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a few honest, lovely words…"
          className="mt-2 block min-h-[170px] w-full resize-y bg-transparent text-2xl leading-8 text-espresso outline-none placeholder:text-chocolate/40 focus-visible:outline-gold script" />
        <p className="script text-right text-2xl text-terracotta">Yours, {nameOf(who)}</p>
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-chocolate/60">{text.length}/1000 · notes are shared with both of you</span>
          <Btn onClick={send} disabled={!text.trim() || busy}>{busy ? 'Sealing…' : 'Seal & send'}</Btn>
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-burgundy">{err}</p>}
      </Card>

      <section aria-label="All notes">
        {data.notes.length === 0 ? <Empty title="No notes yet">Be the first to leave one. A line is plenty.</Empty> : (
          <ul className="space-y-3">
            {data.notes.map((n) => {
              const isNew = n.author !== who && Date.parse(n.created_at) > (seenAtEntry.current ?? 0)
              const l = letterOf(n.message_id)
              return (
                <li key={n.id} className={`card p-4 ${isNew ? 'ring-2 ring-gold' : ''}`}>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2"><WhoDot w={n.author} />{isNew && <span className="chip">New</span>}</span>
                    <span className="text-chocolate/60">{fmtDateTime(Date.parse(n.created_at), SITE.timezone)}</span>
                  </div>
                  {l && <p className="mt-1 text-xs text-terracotta">↩ Reply to Letter {l.position}{l.title ? `: ${l.title}` : ''}</p>}
                  <p className="mt-1.5 whitespace-pre-wrap text-lg leading-snug text-espresso serif">{n.body}</p>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

const CATS: { key: WishRow['category']; label: string; icon: string }[] = [
  { key: 'together', label: 'Things to do together', icon: '🤝' },
  { key: 'date', label: 'Date ideas', icon: '🌹' },
  { key: 'gesture', label: 'Little gestures', icon: '🫶' },
  { key: 'future', label: 'Future experiences', icon: '🌅' },
]

function Wishes() {
  const { data, act } = useData()
  const [cat, setCat] = useState<WishRow['category']>('date')
  const [text, setText] = useState('')
  const [filter, setFilter] = useState<'all' | 'saved' | 'done'>('all')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const req = useRef(newId())
  const list = useMemo(() => (data?.wishes ?? []).filter((w) => filter === 'all' || (filter === 'saved' ? w.saved : !!w.fulfilled_at)), [data, filter])
  if (!data) return null

  const add = async () => {
    if (!text.trim()) return
    setBusy('add'); setErr(null)
    try { await act('add_wish', { category: cat, body: text, clientRequestId: req.current }); setText(''); req.current = newId(); sfx.chime() }
    catch (e) { setErr(explain(e)) } finally { setBusy(null) }
  }
  const upd = async (w: WishRow, patch: { saved?: boolean; fulfilled?: boolean }) => {
    setBusy(w.id); setErr(null)
    try { await act('update_wish', { wishId: w.id, ...patch }); if (patch.fulfilled) { sfx.success(); confetti({ count: 50 }) } }
    catch (e) { setErr(explain(e)) } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6">
        <h2 className="text-3xl text-espresso">Drop a wish in the jar</h2>
        <fieldset className="mt-3"><legend className="sr-only">Wish type</legend>
          <div className="flex flex-wrap gap-2">
            {CATS.map((c) => (
              <label key={c.key} className={`cursor-pointer rounded-full border px-3.5 py-2 text-sm font-semibold transition focus-within:outline focus-within:outline-2 focus-within:outline-gold ${cat === c.key ? 'border-burgundy bg-burgundy text-ivory' : 'border-chocolate/20 bg-white/60'}`}>
                <input type="radio" className="sr-only" name="wishcat" checked={cat === c.key} onChange={() => setCat(c.key)} />{c.icon} {c.label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="wish" className="sr-only">Your wish</label>
          <input id="wish" className="field" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder="e.g. a sunset walk with no phones" onKeyDown={(e) => { if (e.key === 'Enter') void add() }} />
          <Btn onClick={add} disabled={!text.trim() || busy === 'add'}>Add wish</Btn>
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-burgundy">{err}</p>}
      </Card>

      <Segmented<'all' | 'saved' | 'done'> label="Filter wishes" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'All' }, { value: 'saved', label: 'Saved' }, { value: 'done', label: 'Fulfilled' }]} />
      {list.length === 0 ? <Empty title={filter === 'all' ? 'The jar is empty' : 'Nothing here yet'}>{filter === 'all' ? 'Add the first wish above.' : 'Try another filter.'}</Empty> : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((w) => (
            <li key={w.id} className={`card p-4 ${w.fulfilled_at ? 'opacity-80' : ''}`}>
              <div className="flex items-center justify-between text-xs"><span className="chip">{CATS.find((c) => c.key === w.category)?.icon} {CATS.find((c) => c.key === w.category)?.label}</span><WhoDot w={w.author} /></div>
              <p className={`mt-2 text-xl serif text-espresso ${w.fulfilled_at ? 'line-through decoration-gold' : ''}`}>{w.body}</p>
              {w.fulfilled_at && <p className="mt-1 text-xs text-terracotta">✨ Fulfilled {fmtDateTime(Date.parse(w.fulfilled_at), SITE.timezone)}{w.fulfilled_by ? ` by ${nameOf(w.fulfilled_by)}` : ''}</p>}
              <div className="mt-3 flex gap-2">
                <Btn size="sm" variant="ghost" aria-pressed={w.saved} disabled={busy === w.id} onClick={() => upd(w, { saved: !w.saved })}>{w.saved ? '★ Saved' : '☆ Save'}</Btn>
                <Btn size="sm" variant={w.fulfilled_at ? 'ghost' : 'gold'} disabled={busy === w.id} onClick={() => upd(w, { fulfilled: !w.fulfilled_at })}>{w.fulfilled_at ? 'Undo fulfilled' : 'Mark fulfilled'}</Btn>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Memories() {
  return (
    <ol className="relative mx-auto max-w-2xl space-y-8 border-l-2 border-gold/40 pl-6 sm:pl-8" aria-label="Memory lane timeline">
      {MEMORIES.map((m, i) => (
        <li key={i} className="relative">
          <span className="absolute -left-[33px] top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gold bg-ivory sm:-left-[41px]" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-burgundy" /></span>
          <Card className="overflow-hidden">
            {m.photo ? <img src={`${import.meta.env.BASE_URL}${m.photo}`} alt={m.title} className="h-56 w-full object-cover" loading="lazy" />
              : <div className="flex h-28 items-center justify-center bg-gradient-to-br from-cream to-blush/60 text-chocolate/50" aria-hidden="true"><Flower size={56} /></div>}
            <div className="p-5">
              <p className="eyebrow"><Rich text={m.date} /></p>
              <h2 className="mt-1 text-3xl leading-tight text-espresso">{m.title}</h2>
              <p className="mt-2 text-chocolate/85"><Rich text={m.note} /></p>
            </div>
          </Card>
        </li>
      ))}
    </ol>
  )
}

function Badges() {
  const { data } = useData()
  if (!data) return null
  const who = (b: string): Who[] => data.achievements.filter((a) => a.badge_key === b).map((a) => a.participant)
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger">
      {BADGES.map((b) => {
        const got = who(b.key)
        return (
          <Card key={b.key} className={`p-5 text-center ${got.length ? '' : 'opacity-60 grayscale'}`}>
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-gold bg-gradient-to-b from-champagne to-sand text-4xl shadow-inner" aria-hidden="true">{b.emoji}</div>
            <h2 className="mt-3 text-2xl text-espresso">{b.title}</h2>
            <p className="mt-1 text-sm text-chocolate/75">{b.description}</p>
            <p className="mt-2 text-xs font-semibold text-terracotta">{got.length ? got.map(nameOf).join(' & ') : 'Not yet'}</p>
          </Card>
        )
      })}
    </div>
  )
}

