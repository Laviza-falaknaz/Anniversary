import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn, Modal, Rich, WhoDot } from './ui'
import { Heart, Sparkle } from './Ornaments'
import { useData } from '../lib/store'
import { explain, newId } from '../lib/api'
import { fmtDateTime } from '../lib/time'
import { SITE, nameOf } from '../content/site'
import { sfx } from '../lib/audio'
import { confetti } from '../lib/confetti'
import { isCalm } from '../lib/prefs'
import type { LetterRow } from '../lib/types'

const EMOJI = ['❤️', '🥹', '😘', '😂', '🔥', '✨']

export function LetterModal({ letterId, onClose }: { letterId: string | null; onClose: () => void }) {
  const { data, who, act } = useData()
  const letter = data?.letters.find((l) => l.id === letterId) ?? null
  const [phase, setPhase] = useState<'seal' | 'open' | 'read'>('read')
  const recorded = useRef<string | null>(null)

  // Opening: record the read (server verifies the unlock time), then play a short, skippable reveal.
  useEffect(() => {
    if (!letter || !letter.unlocked) return
    const firstTime = !letter.opened_by.some((o) => o.who === who)
    if (recorded.current !== letter.id) {
      recorded.current = letter.id
      void act('open_letter', { messageId: letter.id }).catch(() => { recorded.current = null })
    }
    if (firstTime && !isCalm()) {
      setPhase('seal'); sfx.paper()
      const a = window.setTimeout(() => setPhase('open'), 150)
      const b = window.setTimeout(() => { setPhase('read'); sfx.chime(); confetti({ count: 40, origin: { x: 0.5, y: 0.3 } }) }, 1450)
      return () => { window.clearTimeout(a); window.clearTimeout(b) }
    }
    setPhase('read')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letter?.id])

  const close = () => { recorded.current = null; onClose() }
  return (
    <Modal open={!!letter && letter.unlocked} onClose={close} label={letter ? `Letter ${letter.position}: ${letter.title}` : 'Letter'} wide>
      {letter && letter.unlocked && (phase !== 'read' ? <Reveal onSkip={() => setPhase('read')} open={phase === 'open'} /> : <Reader letter={letter} onClose={close} />)}
    </Modal>
  )
}

function Reveal({ onSkip, open }: { onSkip: () => void; open: boolean }) {
  return (
    <div className="card-dark relative flex min-h-[60dvh] flex-col items-center justify-center overflow-hidden p-8 text-center" onClick={onSkip}>
      <div className="relative w-60 [perspective:800px]" aria-hidden="true">
        <div className="relative h-40 rounded-md bg-[#f2e7d3] shadow-2xl">
          <div className={`absolute inset-x-3 top-3 h-32 rounded bg-[#fffcf4] ${open ? 'env-letter' : ''}`} />
          <div className="absolute inset-x-0 bottom-0 h-24 rounded-b-md bg-[#e9d7b6]" style={{ clipPath: 'polygon(0 100%, 50% 25%, 100% 100%)' }} />
          <div className={`absolute inset-x-0 top-0 h-24 origin-top rounded-t-md bg-[#e7d6b9] ${open ? 'env-flap' : ''}`} style={{ clipPath: 'polygon(0 0, 100% 0, 50% 100%)' }} />
          <Heart className="absolute left-1/2 top-[52px] -translate-x-1/2" size={26} fill="#c9a45c" />
        </div>
      </div>
      <p className="serif mt-8 text-2xl text-champagne">Opening…</p>
      <Btn variant="gold" size="sm" className="mt-5" onClick={(e) => { e.stopPropagation(); onSkip() }}>Skip</Btn>
    </div>
  )
}

function Reader({ letter, onClose }: { letter: LetterRow; onClose: () => void }) {
  const { data, who, act } = useData()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const reqId = useRef(newId())
  const replies = useMemo(() => (data?.notes ?? []).filter((n) => n.message_id === letter.id).slice().reverse(), [data, letter.id])

  const react = async (emoji: string, on: boolean) => {
    setBusy(emoji); setErr(null); sfx.tap()
    try { await act('react', { messageId: letter.id, emoji, on }) } catch (e) { setErr(explain(e)) } finally { setBusy(null) }
  }
  const send = async () => {
    if (!text.trim()) return
    setBusy('reply'); setErr(null)
    try { await act('post_note', { messageId: letter.id, body: text, clientRequestId: reqId.current }); setText(''); reqId.current = newId(); sfx.success() }
    catch (e) { setErr(explain(e)) } finally { setBusy(null) }
  }

  return (
    <article className="card letter-paper relative overflow-hidden p-6 sm:p-10">
      <Sparkle className="absolute right-6 top-6 twinkle" />
      <p className="eyebrow">Letter {letter.position} · {letter.purpose}</p>
      <h2 className="mt-1 text-4xl leading-tight text-espresso sm:text-5xl">{letter.title}</h2>
      <div className="letter-text mt-6"><Rich text={letter.body ?? ''} /></div>

      <section className="mt-8 border-t border-gold/30 pt-5" aria-label="Reactions">
        <p className="mb-2 text-sm font-semibold text-chocolate">How did that feel?</p>
        <div className="flex flex-wrap gap-2">
          {EMOJI.map((e) => {
            const mine = letter.reactions.some((r) => r.emoji === e && r.who === who)
            const n = letter.reactions.filter((r) => r.emoji === e).length
            return (
              <button key={e} onClick={() => react(e, !mine)} disabled={busy === e} aria-pressed={mine} aria-label={`${e} ${mine ? 'remove reaction' : 'react'}`}
                className={`min-h-[46px] min-w-[46px] rounded-full border px-3 text-xl transition active:scale-90 ${mine ? 'border-gold bg-champagne/70 shadow' : 'border-chocolate/20 bg-white/70 hover:bg-white'}`}>
                {e}{n > 0 && <span className="ml-1 text-xs font-semibold text-chocolate">{n}</span>}
              </button>
            )
          })}
        </div>
        {letter.reactions.length > 0 && (
          <p className="mt-2 text-xs text-chocolate/70">{letter.reactions.map((r) => `${nameOf(r.who)} ${r.emoji}`).join(' · ')}</p>
        )}
      </section>

      <section className="mt-6" aria-label="Replies">
        {replies.length > 0 && (
          <ul className="mb-4 space-y-3">
            {replies.map((r) => (
              <li key={r.id} className="rounded-2xl bg-white/70 p-3 text-chocolate">
                <div className="mb-0.5 flex items-center justify-between text-xs"><WhoDot w={r.author} /><span className="text-chocolate/60">{fmtDateTime(Date.parse(r.created_at), SITE.timezone)}</span></div>
                <p className="whitespace-pre-wrap">{r.body}</p>
              </li>
            ))}
          </ul>
        )}
        <label htmlFor="reply" className="mb-1.5 block text-sm font-semibold text-chocolate">Write back (optional)</label>
        <textarea id="reply" className="field min-h-[96px] resize-y font-serif text-lg" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} placeholder="Dear you…" />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-chocolate/60">{text.length}/1000</span>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={onClose}>Close</Btn>
            <Btn onClick={send} disabled={!text.trim() || busy === 'reply'}>{busy === 'reply' ? 'Sending…' : 'Send reply'}</Btn>
          </div>
        </div>
        {err && <p role="alert" className="mt-2 text-sm text-burgundy">{err}</p>}
      </section>
    </article>
  )
}
