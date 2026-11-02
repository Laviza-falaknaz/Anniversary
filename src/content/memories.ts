// ─────────────────────────────────────────────────────────────
// MEMORY LANE. A chronological timeline you edit by hand.
//   - Put photos in /public/memories/ and set `photo: 'memories/first-date.jpg'`.
//   - Entries marked `placeholder: true` show a "fill me in" badge.
// Only the wedding date and today come from your brief; everything else is a placeholder.
// ─────────────────────────────────────────────────────────────
import { SITE } from './site'

export interface Memory {
  date: string // display text, e.g. "14 March 2024"
  title: string
  note: string
  photo?: string
  placeholder?: boolean
}

export const MEMORIES: Memory[] = [
  { date: '[[ADD DATE]]', title: 'How we met', note: '[[ADD: where, when, what you remember thinking]]', placeholder: true },
  { date: '[[ADD DATE]]', title: 'Our first date', note: '[[ADD: the place, the nerves, what happened]]', placeholder: true },
  { date: '[[ADD DATE]]', title: 'The moment I knew', note: '[[ADD: the moment you knew he was the one]]', placeholder: true },
  { date: '2 November 2025', title: 'The day we got married', note: 'The day we promised each other everything. [[ADD: one detail you will never forget, and a photo]]', placeholder: true },
  { date: '[[ADD DATE]]', title: 'Our first trip as a married couple', note: '[[ADD: where you went and what made it special]]', placeholder: true },
  { date: '[[ADD DATE]]', title: `${SITE.petName} joins the family`, note: '[[ADD: the day our cat arrived and took over]]', placeholder: true },
  { date: '2 November 2026', title: 'Our first anniversary', note: 'One year married, and this little website. Today you are reading it.' },
]
