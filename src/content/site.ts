// ─────────────────────────────────────────────────────────────
// Site-wide settings. Change the date / timezone / names here.
// (The password is NOT here: it lives in the Edge Function secret APP_PASSWORD.)
// Colors and fonts: see the @theme block at the top of src/styles.css.
// ─────────────────────────────────────────────────────────────
export type Who = 'laviza' | 'ahmed'

export const SITE = {
  title: 'Our Little World',
  timezone: 'Asia/Dubai',
  anniversaryDate: '2026-11-02', // YYYY-MM-DD, interpreted in `timezone`
  weddingDate: '2025-11-02', // used by Memory Lane
  anniversaryNumber: 1,
  people: {
    laviza: { name: 'Laviza', color: '#a4543c' },
    ahmed: { name: 'Ahmed', color: '#5a2a35' },
  } as Record<Who, { name: string; color: string }>,
  petName: 'Livikzi',
  /** Show small "placeholder" badges on content you still need to personalise. Set to false once done. */
  showPlaceholderBadges: true,
  /** How often the app re-checks the server (seconds). Updates are pulled by polling; no public Realtime channel is used. */
  pollSeconds: 10,
}

export const other = (w: Who): Who => (w === 'laviza' ? 'ahmed' : 'laviza')
export const nameOf = (w: Who): string => SITE.people[w].name
