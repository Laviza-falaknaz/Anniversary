import { useMemo, useState } from 'react'
import { useData, useNow } from '../lib/store'
import { href } from '../lib/router'
import { Countdown } from '../components/Countdown'
import { LetterModal } from '../components/LetterModal'
import { Flower, GiftBox, Garland, Sparkle } from '../components/Ornaments'
import { Btn, Card, Spinner } from '../components/ui'
import { SITE, nameOf, other } from '../content/site'
import { fmtLongDate, fmtTime, nextUnlock } from '../lib/time'

function greeting(ms: number) {
  const h = Number(new Intl.DateTimeFormat('en-GB', { timeZone: SITE.timezone, hour: '2-digit', hourCycle: 'h23' }).format(ms))
  return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

export function Home() {
  const { data, who, unreadNotes } = useData()
  const now = useNow(1000)
  const [openId, setOpenId] = useState<string | null>(null)
  const latest = useMemo(() => data?.letters.filter((l) => l.unlocked).at(-1) ?? null, [data])
  if (!data) return <Spinner label="Unwrapping" />

  const unlocks = data.letters.map((l) => Date.parse(l.unlock_at))
  const next = nextUnlock(unlocks, now)
  const nextLetter = data.letters.find((l) => Date.parse(l.unlock_at) === next)
  const open = data.letters.filter((l) => l.unlocked).length
  const unread = data.letters.filter((l) => l.unlocked && !l.opened_by.some((o) => o.who === who)).length
  const confirmed = data.plans.find((p) => p.status === 'confirmed')
  const proposal = data.plans.find((p) => p.status === 'proposed')
  const spinPending = data.spins.find((s) => s.participant === who && !s.status)

  return (
    <div className="space-y-8 page-enter">
      {/* 1-2. greeting, date, motif */}
      <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-espresso via-chocolate to-burgundy p-7 text-ivory shadow-2xl sm:p-12">
        <Garland className="opacity-60" />
        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="eyebrow !text-champagne">{fmtLongDate(now, SITE.timezone)}</p>
            <h1 className="mt-3 text-5xl leading-[1.02] sm:text-7xl">{greeting(now)},<br /><span className="italic text-champagne">{nameOf(who)}</span>.</h1>
            <p className="mt-4 max-w-md text-lg text-ivory/85 serif italic">
              {who === 'ahmed' ? 'Happy first anniversary. This little world is all yours today.' : 'Happy first anniversary. Here is everything, ready for you to peek at.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {unread > 0 ? <Btn variant="gold" onClick={() => setOpenId(data.letters.find((l) => l.unlocked && !l.opened_by.some((o) => o.who === who))!.id)}>Open a new letter ({unread})</Btn>
                : latest && <Btn variant="gold" onClick={() => setOpenId(latest.id)}>Read the latest letter</Btn>}
              <a className="btn btn-ghost !bg-ivory/10 !text-ivory !border-ivory/30" href={href('/letters')}>All letters</a>
            </div>
          </div>
          <div className="mx-auto hidden h-44 w-44 items-center justify-center rounded-full border border-champagne/40 md:flex" aria-hidden="true">
            <div className="text-center"><div className="serif text-8xl leading-none text-champagne">{SITE.anniversaryNumber}</div><div className="eyebrow !text-champagne/80">year married</div></div>
          </div>
        </div>
      </section>

      {/* 3. next unlock */}
      <section className="grid gap-4 md:grid-cols-2" aria-label="Letters">
        <Card dark className="p-6">
          {next && nextLetter ? (
            <>
              <p className="eyebrow !text-champagne">Next letter · {fmtTime(next, SITE.timezone)}</p>
              <Countdown target={next} className="mt-1 text-6xl text-ivory" />
              <p className="mt-2 text-champagne/85">“{nextLetter.teaser}”</p>
            </>
          ) : (
            <><p className="eyebrow !text-champagne">That's all of them</p><p className="serif mt-2 text-3xl">Every letter is open.</p></>
          )}
          <p className="mt-4 text-sm text-champagne/80">{open} of {data.letters.length} letters open · {data.letters.length - open} to come</p>
        </Card>

        {/* 4. latest letter */}
        <Card className="flex flex-col justify-between p-6">
          {latest ? (
            <>
              <div>
                <p className="eyebrow">Latest · Letter {latest.position}</p>
                <h2 className="mt-1 text-3xl leading-tight text-espresso">{latest.title}</h2>
                <p className="mt-2 text-chocolate/75">{latest.purpose}</p>
              </div>
              <Btn className="mt-5 self-start" onClick={() => setOpenId(latest.id)}>{latest.opened_by.some((o) => o.who === who) ? 'Read again' : 'Open it'}</Btn>
            </>
          ) : <p className="serif text-2xl">The first letter is on its way.</p>}
        </Card>
      </section>

      {/* 5-6, 10. keepsakes / notes */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger" aria-label="Explore">
        <Tile to="/play/wheel" title="Spin the gift wheel" icon={<GiftBox size={56} />}>
          {spinPending ? 'You have a reward waiting for a decision.' : 'A tiny surprise, picked fairly by the wheel.'}
        </Tile>
        <Tile to="/tonight" title="Plan tonight" icon={<span className="text-4xl">🥂</span>}>
          {confirmed ? 'Tonight is planned. See the evening.' : proposal ? (proposal.confirmed_by.includes(who) ? 'Waiting for the other to confirm.' : `${nameOf(proposal.proposed_by)} suggested a plan. Take a look.`) : "Choose what we do together. It's not decided yet."}
        </Tile>
        <Tile to="/keepsakes" title="Notes & keepsakes" icon={<Flower size={56} />} badge={unreadNotes}>
          {unreadNotes > 0 ? `${unreadNotes} new note${unreadNotes > 1 ? 's' : ''} from ${nameOf(other(who))}.` : 'Leave a little note, make a wish, wander Memory Lane.'}
        </Tile>
      </section>

      {/* 8. discoverable bonus */}
      <section aria-label="Little extras">
        <p className="eyebrow mb-3 flex items-center gap-2"><Sparkle size={14} /> Hidden in the corners</p>
        <div className="flex flex-wrap gap-2.5">
          {[['/play/open-when', '✉️ Open when…'], ['/play/quiz', '🧩 Our little quiz'], ['/play/adventure', '🚪 Choose your surprise'], ['/keepsakes/wishes', '🫙 Wish jar'], ['/keepsakes/memories', '📷 Memory lane'], ['/keepsakes/badges', '🏅 Badges']].map(([to, l]) => (
            <a key={to} href={href(to)} className="btn btn-ghost">{l}</a>
          ))}
        </div>
      </section>
      <LetterModal letterId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function Tile({ to, title, icon, children, badge }: { to: string; title: string; icon: React.ReactNode; children: React.ReactNode; badge?: number }) {
  return (
    <a href={href(to)} className="card group relative flex items-start gap-4 p-5 transition hover:-translate-y-1 hover:shadow-2xl">
      <div className="shrink-0 transition group-hover:rotate-6">{icon}</div>
      <div>
        <h2 className="text-2xl leading-tight text-espresso">{title}</h2>
        <p className="mt-1 text-sm text-chocolate/75">{children}</p>
      </div>
      {!!badge && <span className="chip anim-glow absolute right-3 top-3">{badge} new</span>}
    </a>
  )
}
