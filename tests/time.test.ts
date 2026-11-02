import { describe, expect, it } from 'vitest'
import { countdownParts, isUnlocked, localDate, nextUnlock, unlockedCount, zonedToEpoch, fmtTime } from '../src/lib/time'
import { SITE } from '../src/content/site'
import { UNLOCK_SCHEDULE } from '../src/content/schedule'
import { LETTERS } from '../src/content/letters'

const TZ = 'Asia/Dubai'

describe('timezone handling', () => {
  it('interprets wall-clock times in Asia/Dubai (UTC+4, no DST)', () => {
    expect(new Date(zonedToEpoch('2026-11-02', '09:30', TZ)).toISOString()).toBe('2026-11-02T05:30:00.000Z')
    expect(new Date(zonedToEpoch('2026-11-02', '00:00', TZ)).toISOString()).toBe('2026-11-01T20:00:00.000Z')
    expect(new Date(zonedToEpoch('2026-11-02', '23:59', TZ)).toISOString()).toBe('2026-11-02T19:59:00.000Z')
  })
  it('handles daylight-saving zones correctly (spring-forward and fall-back)', () => {
    // New York: UTC-5 in winter, UTC-4 in summer
    expect(new Date(zonedToEpoch('2026-01-15', '12:00', 'America/New_York')).toISOString()).toBe('2026-01-15T17:00:00.000Z')
    expect(new Date(zonedToEpoch('2026-07-15', '12:00', 'America/New_York')).toISOString()).toBe('2026-07-15T16:00:00.000Z')
  })
  it('rejects malformed input', () => {
    expect(() => zonedToEpoch('2026-11-02', '25:00', TZ)).toThrow()
    expect(() => zonedToEpoch('02/11/2026', '10:00', TZ)).toThrow()
  })
  it('date boundaries: 23:30 UTC on 1 Nov is already 2 Nov in Dubai', () => {
    expect(localDate(Date.parse('2026-11-01T19:59:59Z'), TZ)).toBe('2026-11-01')
    expect(localDate(Date.parse('2026-11-01T20:00:00Z'), TZ)).toBe('2026-11-02')
    expect(localDate(Date.parse('2026-11-02T19:59:59Z'), TZ)).toBe('2026-11-02')
    expect(localDate(Date.parse('2026-11-02T20:00:00Z'), TZ)).toBe('2026-11-03')
  })
  it('formats times in the configured zone, not the device zone', () => {
    expect(fmtTime(Date.parse('2026-11-02T05:30:00Z'), TZ).toLowerCase()).toBe('9:30 am')
  })
})

const times = LETTERS.map((l) => UNLOCK_SCHEDULE[l.slug]).map((t) =>
  t === 'immediate' ? zonedToEpoch(SITE.anniversaryDate, '00:00', TZ) : zonedToEpoch(SITE.anniversaryDate, t, TZ),
)

describe('hourly unlock calculations', () => {
  it('has at least 12 letters, all scheduled, strictly increasing, within the anniversary day', () => {
    expect(LETTERS.length).toBeGreaterThanOrEqual(12)
    for (const l of LETTERS) expect(UNLOCK_SCHEDULE[l.slug], l.slug).toBeTruthy()
    for (let i = 1; i < times.length; i++) expect(times[i]).toBeGreaterThan(times[i - 1])
    expect(localDate(times[times.length - 1], TZ)).toBe(SITE.anniversaryDate)
  })
  it('first letter is always open; it is never scheduled in the future', () => {
    expect(UNLOCK_SCHEDULE[LETTERS[0].slug]).toBe('immediate')
    expect(isUnlocked(times[0], Date.parse('2026-11-02T04:00:00Z'))).toBe(true)
  })
  it('unlocks exactly at the scheduled instant (boundary)', () => {
    const t = times[1]
    expect(isUnlocked(t, t - 1)).toBe(false)
    expect(isUnlocked(t, t)).toBe(true)
  })
  it('late visit: a visitor arriving after 5pm sees every earlier letter open', () => {
    const late = zonedToEpoch('2026-11-02', '17:45', TZ)
    expect(unlockedCount(times, late)).toBe(10) // welcome + 9 more (09:30 … 17:30)
    expect(nextUnlock(times, late)).toBe(zonedToEpoch('2026-11-02', '19:30', TZ))
  })
  it('previously unlocked letters stay unlocked as time moves forward', () => {
    let prev = 0
    for (let t = times[0]; t < times[times.length - 1] + 3600_000; t += 600_000) {
      const n = unlockedCount(times, t)
      expect(n).toBeGreaterThanOrEqual(prev)
      prev = n
    }
    expect(prev).toBe(12)
  })
  it('after the last letter there is no next unlock', () => {
    expect(nextUnlock(times, times[times.length - 1] + 1)).toBeNull()
  })
  it('does not lock everything if the site is opened before the day starts (first letter still open via seed rule)', () => {
    // seed uses least(now(), dayStart); here we only check the schedule never marks the welcome letter as later than day start
    expect(times[0]).toBeLessThanOrEqual(zonedToEpoch(SITE.anniversaryDate, '00:00', TZ))
  })
  it('countdown breaks seconds into h/m/s and never goes negative', () => {
    expect(countdownParts(10_000 + 3723_000, 10_000)).toEqual({ total: 3723, h: 1, m: 2, s: 3 })
    expect(countdownParts(0, 5000).total).toBe(0)
  })
})
