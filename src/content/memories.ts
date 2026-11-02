// ─────────────────────────────────────────────────────────────
// MEMORY LANE. A chronological timeline you edit by hand.
//   - Put photos in /public/memories/ and set `photo: 'memories/first-date.jpg'`.
//   - Entries marked `placeholder: true` show a "fill me in" badge.
// Years for the 2025/2026 entries were inferred from the 2 Nov 2025 wedding date: correct them if needed.
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
  { date: '14 October 2025', title: 'We met on Muzz', note: 'Two strangers, one app, and the start of everything.' },
  { date: '17 October 2025', title: 'Our first date at Al Mamzar Beach', note: 'We had pizza by the sea and ended up staying together for eight hours. Neither of us wanted it to end.' },
  { date: 'From the very first day', title: `${SITE.petName} was there`, note: `${SITE.petName} was Laviza's long before Ahmed came along, and she has been part of us since day one.` },
  { date: '25 October 2025', title: 'We decided to get married', note: 'Eleven days after we met, we knew.' },
  { date: '2 November 2025', title: 'The day we got married', note: 'One week later, we made it official.' },
  { date: '14 February 2026', title: 'Our first Umrah together', note: 'Our first journey as husband and wife, and a trip of the heart.' },
  { date: '2 November 2026', title: 'Our first anniversary', note: 'One year married, and this little website. Today you are reading it.' },
]
