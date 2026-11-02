import { useState } from 'react'
import { useData, useNow } from '../lib/store'
import { EnvelopeCard } from '../components/EnvelopeCard'
import { LetterModal } from '../components/LetterModal'
import { Countdown } from '../components/Countdown'
import { PageTitle, Card } from '../components/ui'
import { SITE } from '../content/site'
import { fmtTime, nextUnlock } from '../lib/time'

export function NextUnlockBanner() {
  const { data } = useData()
  const now = useNow(1000)
  if (!data) return null
  const next = nextUnlock(data.letters.map((l) => Date.parse(l.unlock_at)), now)
  const nextLetter = data.letters.find((l) => Date.parse(l.unlock_at) === next)
  const open = data.letters.filter((l) => l.unlocked).length
  const waiting = data.letters.length - open
  return (
    <Card dark className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
      {next && nextLetter ? (
        <div>
          <p className="eyebrow !text-champagne">Next letter · {fmtTime(next, SITE.timezone)}</p>
          <Countdown target={next} className="mt-1 text-5xl text-ivory sm:text-6xl" />
          <p className="mt-1 text-sm text-champagne/80">{nextLetter.teaser}</p>
        </div>
      ) : (
        <div><p className="eyebrow !text-champagne">All letters open</p><p className="serif mt-1 text-3xl text-ivory">Every letter is waiting for you.</p></div>
      )}
      <div className="text-right text-sm text-champagne/90"><p><strong className="serif text-3xl text-ivory">{open}</strong> of {data.letters.length} open</p><p>{waiting} still waiting</p></div>
    </Card>
  )
}

export function Letters() {
  const { data, who } = useData()
  const now = useNow(5000)
  const [openId, setOpenId] = useState<string | null>(null)
  if (!data) return null
  return (
    <div className="page-enter space-y-6">
      <PageTitle eyebrow="The letters" title="A letter for every few hours">New ones unlock by themselves through the day. The ones you've opened stay here for good.</PageTitle>
      <NextUnlockBanner />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger" aria-label="Letter archive">
        {data.letters.map((l) => <EnvelopeCard key={l.id} letter={l} me={who} now={now} onOpen={(x) => setOpenId(x.id)} />)}
      </div>
      <LetterModal letterId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
