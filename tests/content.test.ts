import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { BADGES } from '../src/content/badges'
import { REWARDS } from '../src/content/rewards'
import { PLANNER_OPTIONS } from '../src/content/planner'
import { QUIZ } from '../src/content/quiz'
import { OPEN_WHEN, ADVENTURE } from '../src/content/bonus'
import { LETTERS } from '../src/content/letters'

const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]))
const schema = readFileSync('supabase/migrations/20261102000001_schema.sql', 'utf8')

describe('content consistency', () => {
  it('badge keys match the database constraint', () => {
    const m = /badge_key text not null check \(badge_key in\s*\(([^)]*)\)/s.exec(schema.replace(/\s+/g, ' '))![1]
    const dbKeys = [...m.matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort()
    expect(BADGES.map((b) => b.key).sort()).toEqual(dbKeys)
  })
  it('keys are unique and rewards/options are valid', () => {
    for (const list of [REWARDS.map((r) => r.key), PLANNER_OPTIONS.map((o) => o.key), QUIZ.map((q) => q.key), OPEN_WHEN.map((o) => o.key), ADVENTURE.map((a) => a.id), LETTERS.map((l) => l.slug)]) {
      expect(new Set(list).size).toBe(list.length)
    }
    expect(REWARDS.length).toBeGreaterThanOrEqual(9)
    for (const c of ['mood', 'activity', 'cuisine', 'extra']) expect(PLANNER_OPTIONS.some((o) => o.category === c)).toBe(true)
  })
  it('every quiz question has its correct option; adventure paths all resolve and end', () => {
    for (const q of QUIZ) expect(q.options.some((o) => o.key === q.correct)).toBe(true)
    const ids = new Set(ADVENTURE.map((n) => n.id))
    for (const n of ADVENTURE) for (const c of n.choices ?? []) expect(ids.has(c.next)).toBe(true)
    expect(ADVENTURE.filter((n) => n.ending).length).toBeGreaterThanOrEqual(4)
  })
  it('letter text is never shipped in the browser bundle sources (server-gated)', () => {
    for (const f of walk('src').filter((f) => /\.tsx?$/.test(f))) {
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/content\/letters/)
    }
  })
  it('the password and service key never appear in frontend source', () => {
    for (const f of walk('src')) {
      const t = readFileSync(f, 'utf8')
      expect(t, f).not.toMatch(/dev-password/i)
      expect(t, f).not.toMatch(/service_role/i)
    }
  })
})
