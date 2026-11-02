import { useEffect, useMemo, useRef, useState } from 'react'
import { useData } from '../lib/store'
import { Btn, Empty, PageTitle, Segmented } from '../components/ui'
import { SITE, nameOf, other, type Who } from '../content/site'
import { fmtDateTime, fmtTime, localDate } from '../lib/time'
import { BADGES } from '../content/badges'
import type { ActivityRow } from '../lib/types'

type Filter = 'all' | 'letters' | 'notes' | 'gifts' | 'date'
const GROUPS: Record<Filter, string[] | null> = {
  all: null,
  letters: ['letter_opened', 'reaction_added', 'reply_posted', 'open_when_opened'],
  notes: ['note_posted', 'reply_posted', 'wish_added', 'wish_fulfilled'],
  gifts: ['gift_spun', 'gift_resolved', 'achievement_unlocked'],
  date: ['planner_preference', 'plan_proposed', 'plan_confirmed'],
}

function describe(e: ActivityRow): { icon: string; verb: string; quote?: string } {
  switch (e.event_type) {
    case 'letter_opened': return { icon: '💌', verb: `opened ${e.detail}` }
    case 'reaction_added': return { icon: e.detail.split(' ')[0], verb: `reacted ${e.detail}` }
    case 'reply_posted': return { icon: '↩️', verb: 'replied', quote: e.detail }
    case 'note_posted': return { icon: '🪶', verb: 'wrote a note', quote: e.detail }
    case 'gift_spun': return { icon: '🎡', verb: `spun the wheel and got “${e.detail}”` }
    case 'gift_resolved': { const [label, st] = e.detail.split(' → '); return { icon: '🎁', verb: `${st === 'claimed' ? 'saved' : st === 'swapped' ? 'swapped' : 'passed on'} “${label}”` } }
    case 'wish_added': return { icon: '🫙', verb: 'added a wish', quote: e.detail.replace(/^\[\w+\]\s*/, '') }
    case 'wish_fulfilled': return { icon: '🌠', verb: 'marked a wish fulfilled', quote: e.detail }
    case 'quiz_completed': return { icon: '🧩', verb: `finished the quiz (${e.detail})` }
    case 'planner_preference': return { icon: '🥂', verb: `hearted “${e.detail}” for tonight` }
    case 'plan_proposed': return { icon: '📝', verb: 'proposed a plan for tonight', quote: e.detail }
    case 'plan_confirmed': return { icon: '✅', verb: 'tonight’s plan is confirmed by both' }
    case 'achievement_unlocked': { const b = BADGES.find((x) => x.key === e.detail); return { icon: b?.emoji ?? '🏅', verb: `unlocked the “${b?.title ?? e.detail}” badge` } }
    case 'open_when_opened': return { icon: '✉️', verb: `opened “Open when…” (${e.detail})` }
    case 'adventure_finished': return { icon: '🚪', verb: `finished the adventure (${e.detail.replace('end_', '')})` }
    default: return { icon: '•', verb: e.event_type }
  }
}

export function Activity() {
  const { data, who, markSeen, refresh, error, live } = useData()
  const [filter, setFilter] = useState<Filter>('all')
  const [person, setPerson] = useState<Who | 'all'>(other(who))
  const seenAtEntry = useRef<number | null>(null)
  if (data && seenAtEntry.current === null) seenAtEntry.current = Date.parse(data.seen.activity_seen_at)
  useEffect(() => { const t = window.setTimeout(() => void markSeen('activity'), 2000); return () => window.clearTimeout(t) }, [markSeen])

  const rows = useMemo(() => {
    const types = GROUPS[filter]
    return (data?.activity ?? []).filter((e) => (!types || types.includes(e.event_type)) && (person === 'all' || e.participant === person))
  }, [data, filter, person])
  if (!data) return null

  const stat = (w: Who) => ({
    letters: data.letters.filter((l) => l.opened_by.some((o) => o.who === w)).length,
    notes: data.notes.filter((n) => n.author === w).length,
    badges: data.achievements.filter((a) => a.participant === w).length,
  })
  const s = stat(other(who))
  const days = new Map<string, ActivityRow[]>()
  for (const e of rows) { const d = localDate(Date.parse(e.created_at), SITE.timezone); days.set(d, [...(days.get(d) ?? []), e]) }

  return (
    <div className="page-enter space-y-6">
      <PageTitle eyebrow="Activity" title={`What ${nameOf(other(who))} has been up to`}>
        A quiet look at the day, in {SITE.timezone.replace('_', ' ')} time. This page only shows; everything happens in its own place.
      </PageTitle>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-chocolate/80">
        <span><strong className="serif text-2xl text-espresso">{s.letters}</strong> / {data.letters.length} letters opened</span>
        <span><strong className="serif text-2xl text-espresso">{s.notes}</strong> notes</span>
        <span><strong className="serif text-2xl text-espresso">{s.badges}</strong> badges</span>
        <span className="ml-auto text-xs">{live ? '● live' : '○ refreshes every few seconds'}</span>
      </div>

      <div className="space-y-3">
        <Segmented<Filter> label="Activity type" value={filter} onChange={setFilter} options={[
          { value: 'all', label: 'All Activity' }, { value: 'letters', label: 'Love Letters' }, { value: 'notes', label: 'Notes' }, { value: 'gifts', label: 'Gifts' }, { value: 'date', label: 'Date Night' }]} />
        <Segmented<Who | 'all'> label="Person" value={person} onChange={setPerson} options={[
          { value: other(who), label: nameOf(other(who)) }, { value: who, label: 'Me' }, { value: 'all', label: 'Both of us' }]} />
      </div>

      {error && <div role="alert" className="card flex items-center justify-between gap-3 p-4 text-burgundy"><span>Couldn't refresh just now.</span><Btn size="sm" variant="ghost" onClick={() => void refresh()}>Retry</Btn></div>}

      {rows.length === 0 ? <Empty title="Nothing here yet">When {nameOf(other(who))} opens a letter, leaves a note or makes a choice, it will show up here.</Empty> : (
        [...days.entries()].map(([day, list]) => (
          <section key={day} aria-label={day}>
            <h2 className="mb-2 text-2xl text-espresso">{new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(Date.parse(day + 'T12:00:00Z'))}</h2>
            <ol className="space-y-2">
              {list.map((e) => {
                const d = describe(e)
                const fresh = e.participant !== who && Date.parse(e.created_at) > (seenAtEntry.current ?? 0)
                return (
                  <li key={e.id} className={`card flex items-start gap-3 p-3.5 ${fresh ? 'ring-2 ring-gold' : ''}`}>
                    <span className="mt-0.5 text-2xl" aria-hidden="true">{d.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-chocolate"><strong style={{ color: SITE.people[e.participant].color }}>{nameOf(e.participant)}</strong> {d.verb}{fresh && <span className="chip ml-2">New</span>}</p>
                      {d.quote && <blockquote className="serif mt-1 whitespace-pre-wrap border-l-2 border-gold pl-3 text-lg text-espresso">{d.quote}</blockquote>}
                    </div>
                    <time className="shrink-0 text-xs text-chocolate/60" dateTime={e.created_at} title={fmtDateTime(Date.parse(e.created_at), SITE.timezone)}>{fmtTime(Date.parse(e.created_at), SITE.timezone)}</time>
                  </li>
                )
              })}
            </ol>
          </section>
        ))
      )}
    </div>
  )
}
