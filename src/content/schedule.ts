// ─────────────────────────────────────────────────────────────
// THE UNLOCK SCHEDULE: the one place to change when each letter opens.
//
// Times are local to SITE.timezone on SITE.anniversaryDate.
//   'immediate' → open from the moment the site is deployed (never in the future)
//   'HH:mm'     → opens at that local time
// After changing this, regenerate the seed (npm run seed) and run supabase/seed.sql
// again; unlock times are enforced by the database, not the browser.
// ─────────────────────────────────────────────────────────────
export const UNLOCK_SCHEDULE: Record<string, 'immediate' | string> = {
  welcome: 'immediate',
  gratitude: '09:30',
  quality: '10:30',
  everyday: '11:30',
  memory: '12:30',
  flirty: '13:30',
  effort: '14:30',
  reassurance: '15:30',
  future: '16:30',
  tonight: '17:30',
  cheeky: '19:30',
  final: '21:30',
}
