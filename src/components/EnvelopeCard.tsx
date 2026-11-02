import type { LetterRow } from '../lib/types'
import { SITE, other, nameOf, type Who } from '../content/site'
import { fmtTime } from '../lib/time'

function EnvelopeArt({ locked, hue }: { locked: boolean; hue: string }) {
  return (
    <svg viewBox="0 0 120 84" className="w-full" aria-hidden="true">
      <rect x="3" y="12" width="114" height="68" rx="7" fill={hue} stroke="#b98f45" strokeOpacity=".6" strokeWidth="1.4" />
      {locked ? (
        <>
          <path d="M3 16l57 38 57-38" fill="#00000010" stroke="#b98f45" strokeOpacity=".5" strokeWidth="1.4" />
          <circle cx="60" cy="50" r="11" fill="#6b2434" /><path d="M60 57s-7-4.5-7-9.200a3.800 3.800 0 016.500-2.500 3.800 3.800 0 016.500 2.500c0 4.700-6 9.200-6 9.200z" fill="#e6d2a8" />
        </>
      ) : (
        <>
          <rect x="14" y="4" width="92" height="54" rx="4" fill="#fffcf4" stroke="#e7d6b9" />
          <path d="M24 18h72M24 28h60M24 38h66" stroke="#b0583a" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
          <path d="M3 80l45-34M117 80L72 46" stroke="#b98f45" strokeOpacity=".45" strokeWidth="1.4" />
          <path d="M3 14l57 36 57-36v-1l-57 33L3 13z" fill="#00000008" />
        </>
      )}
    </svg>
  )
}

export function EnvelopeCard({ letter, me, onOpen, now }: { letter: LetterRow; me: Who; onOpen: (l: LetterRow) => void; now: number }) {
  const unlockAt = Date.parse(letter.unlock_at)
  const mine = letter.opened_by.some((o) => o.who === me)
  const theirs = letter.opened_by.some((o) => o.who === other(me))
  const hue = ['#f2e7d3', '#efd9cc', '#ecd5a6', '#e9cfc8'][letter.position % 4]

  if (!letter.unlocked) {
    return (
      <div className="card relative overflow-hidden p-4 opacity-95" aria-label={`Letter ${letter.position}, locked. Opens at ${fmtTime(unlockAt, SITE.timezone)}`}>
        <div className="mx-auto max-w-[190px] grayscale-[35%]"><EnvelopeArt locked hue={hue} /></div>
        <p className="eyebrow mt-3 text-center">Letter {letter.position}</p>
        <p className="serif mt-1 text-center text-xl text-espresso/80">{letter.teaser}</p>
        <p className="mt-2 text-center text-sm text-chocolate/70">Opens at <strong>{fmtTime(unlockAt, SITE.timezone)}</strong></p>
        <span className="sr-only">{unlockAt > now ? '' : 'Opening now'}</span>
      </div>
    )
  }
  return (
    <button onClick={() => onOpen(letter)} className="card group relative block w-full p-4 text-left transition hover:-translate-y-1 hover:shadow-2xl">
      {!mine && <span className="chip anim-glow absolute right-3 top-3">New</span>}
      <div className="mx-auto max-w-[190px] transition group-hover:scale-[1.03]"><EnvelopeArt locked={false} hue={hue} /></div>
      <p className="eyebrow mt-3 text-center">Letter {letter.position} · {letter.purpose}</p>
      <p className="serif mt-1 text-center text-2xl leading-tight text-espresso">{letter.title}</p>
      <p className="mt-2 text-center text-xs text-chocolate/65">
        {mine ? 'Read' : 'Unread'}{theirs ? ` · ${nameOf(other(me))} has read it` : ''}
      </p>
    </button>
  )
}
