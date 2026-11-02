// Timezone helpers. Everything is based on absolute instants (epoch ms); the
// timezone is only used to interpret wall-clock times and to format for display.

/** Offset (ms) of `tz` from UTC at the given instant: positive when tz is ahead of UTC. */
export function tzOffsetMs(instantMs: number, tz: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
  const p: Record<string, number> = {}
  for (const part of dtf.formatToParts(new Date(instantMs))) {
    if (part.type !== 'literal') p[part.type] = Number(part.value)
  }
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instantMs / 1000) * 1000
}

/** Converts a wall-clock date + time in `tz` (e.g. "2026-11-02", "09:30") to an epoch-ms instant. */
export function zonedToEpoch(date: string, time: string, tz: string): number {
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const tm = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!dm || !tm) throw new Error(`Bad date/time: ${date} ${time}`)
  const hh = Number(tm[1]), mm = Number(tm[2])
  if (hh > 23 || mm > 59) throw new Error(`Bad time: ${time}`)
  const guess = Date.UTC(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), hh, mm)
  let result = guess - tzOffsetMs(guess, tz)
  result = guess - tzOffsetMs(result, tz) // settles across DST changes
  return result
}

export interface LetterSlot { unlockAt: number }

/** Unlock check against a (server-synchronised) clock. */
export const isUnlocked = (unlockAtMs: number, nowMs: number): boolean => unlockAtMs <= nowMs

export function unlockedCount(unlocks: number[], nowMs: number): number {
  return unlocks.filter((u) => u <= nowMs).length
}

/** The next unlock strictly in the future, or null when everything has opened. */
export function nextUnlock(unlocks: number[], nowMs: number): number | null {
  const future = unlocks.filter((u) => u > nowMs)
  return future.length ? Math.min(...future) : null
}

export function countdownParts(targetMs: number, nowMs: number) {
  const total = Math.max(0, Math.ceil((targetMs - nowMs) / 1000))
  return { total, h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 }
}

export function fmtTime(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(ms)
}
export function fmtDateTime(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: tz, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true,
  }).format(ms)
}
export function fmtLongDate(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(ms)
}
/** Local calendar date (YYYY-MM-DD) of an instant in tz. */
export function localDate(ms: number, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(ms)
}
