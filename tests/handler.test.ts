import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { handle, type Deps } from '../supabase/functions/anniv/handler'
import { signToken, verifyToken } from '../supabase/functions/anniv/jwt'
import { freshDb, letterId, rpc as dbRpc, shiftLetter, uid } from './helpers/db'

const SECRET = 'test-secret-test-secret-1234567890'
let db: PGlite
let clock = Date.parse('2026-11-02T06:00:00Z')

const deps = (over: Partial<Deps['env']> = {}): Deps => ({
  rpc: (fn, args) => dbRpc(db, fn, args),
  env: { APP_PASSWORD: 'dev-password', SESSION_SECRET: SECRET, ...over },
  now: () => clock,
})

async function call(body: unknown, token?: string, env: Partial<Deps['env']> = {}, ip = '1.2.3.4') {
  const res = await handle(
    new Request('https://x.test/functions/v1/anniv', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...(token ? { 'x-session-token': token } : {}) },
      body: JSON.stringify(body),
    }),
    deps(env),
  )
  return { status: res.status, json: (await res.json()) as any, headers: res.headers }
}

async function session(who: 'laviza' | 'ahmed' = 'ahmed') {
  const login = await call({ action: 'login', password: 'dev-password' })
  const id = await call({ action: 'identify', who }, login.json.token)
  return id.json.token as string
}

beforeEach(async () => { db = await freshDb(); clock = Date.parse('2026-11-02T06:00:00Z') })

describe('password gate (server-side)', () => {
  it('accepts the right password (case/whitespace-insensitive) and returns an expiring token', async () => {
    const r = await call({ action: 'login', password: '  DEV-password ' })
    expect(r.status).toBe(200)
    expect(r.json.expiresAt).toBe(clock + 24 * 3600 * 1000)
    expect(await verifyToken(r.json.token, SECRET, clock)).toMatchObject({ sub: 'guest' })
  })
  it('rejects a wrong password with a helpful remaining-attempts count and no token', async () => {
    const r = await call({ action: 'login', password: 'Biscuit' })
    expect(r.status).toBe(401)
    expect(r.json).toMatchObject({ error: 'wrong_password', attemptsLeft: 4 })
    expect(r.json.token).toBeUndefined()
  })
  it('supports several accepted passwords via comma-separated secret', async () => {
    expect((await call({ action: 'login', password: 'second' }, undefined, { APP_PASSWORD: 'first, second' })).status).toBe(200)
  })
  it('rate-limits after 5 failed attempts from one address, even for the right password; other addresses unaffected', async () => {
    for (let i = 0; i < 5; i++) expect((await call({ action: 'login', password: 'nope' })).status).toBe(401)
    const locked = await call({ action: 'login', password: 'dev-password' })
    expect(locked.status).toBe(429)
    expect(locked.json.retryAfter).toBeGreaterThan(0)
    expect((await call({ action: 'login', password: 'dev-password' }, undefined, {}, '9.9.9.9')).status).toBe(200)
  })
  it('never stores raw IP addresses', async () => {
    await call({ action: 'login', password: 'nope' }, undefined, {}, '203.0.113.7')
    const rows = (await db.query<{ ip_hash: string }>('select ip_hash from login_attempts')).rows
    expect(rows).toHaveLength(1)
    expect(rows[0].ip_hash).not.toContain('203.0.113.7')
    expect(rows[0].ip_hash).toMatch(/^[0-9a-f]{64}$/)
  })
  it('refuses to run unconfigured (no secret or password)', async () => {
    expect((await call({ action: 'login', password: 'x' }, undefined, { SESSION_SECRET: undefined })).status).toBe(500)
    expect((await call({ action: 'login', password: 'x' }, undefined, { APP_PASSWORD: '' })).status).toBe(500)
  })
  it('the password is never present in any response', async () => {
    const r = await call({ action: 'login', password: 'wrong' })
    expect(JSON.stringify(r.json)).not.toContain('dev-password')
  })
})

describe('session validation', () => {
  it('rejects missing, garbage, tampered, wrongly-signed and expired tokens', async () => {
    expect((await call({ action: 'sync' })).status).toBe(401)
    expect((await call({ action: 'sync' }, 'abc.def.ghi')).status).toBe(401)
    const good = await session()
    const [h, p, s] = good.split('.')
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 'guest', who: 'laviza', iat: 1, exp: 9999999999 })).toString('base64url')
    expect((await call({ action: 'sync' }, `${h}.${forgedPayload}.${s}`)).status).toBe(401)
    const other = await signToken({ sub: 'guest', who: 'ahmed', iat: 1, exp: 9999999999 }, 'a-different-secret-entirely-xx')
    expect((await call({ action: 'sync' }, other)).status).toBe(401)
    clock += 25 * 3600 * 1000 // a day later
    const expired = await call({ action: 'sync' }, good)
    expect(expired.status).toBe(401); expect(expired.json.error).toBe('invalid_session')
    expect(p).toBeTruthy()
  })
  it('rejects an alg:none style token', async () => {
    const b = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url')
    const t = `${b({ alg: 'none', typ: 'JWT' })}.${b({ sub: 'guest', who: 'ahmed', iat: 1, exp: 9999999999 })}.`
    expect((await call({ action: 'sync' }, t)).status).toBe(401)
  })
  it('identity is taken from the signed token, never the request body', async () => {
    const t = await session('ahmed')
    const id = await letterId(db, 1)
    await call({ action: 'open_letter', messageId: id, who: 'laviza', participant: 'laviza' }, t)
    const rows = (await db.query<{ participant: string }>('select participant from message_reads')).rows
    expect(rows).toEqual([{ participant: 'ahmed' }])
  })
  it('a login token without a chosen identity cannot read or write data', async () => {
    const login = await call({ action: 'login', password: 'dev-password' })
    const r = await call({ action: 'sync' }, login.json.token)
    expect(r.status).toBe(403); expect(r.json.error).toBe('identity_required')
    expect((await call({ action: 'identify', who: 'mallory' }, login.json.token)).status).toBe(400)
  })
  it('honours SESSION_TTL_HOURS', async () => {
    const r = await call({ action: 'login', password: 'dev-password' }, undefined, { SESSION_TTL_HOURS: '2' })
    expect(r.json.expiresAt).toBe(clock + 2 * 3600 * 1000)
  })
})

describe('protected operations through the API', () => {
  it('sync returns data; locked letter text is not in the payload', async () => {
    await shiftLetter(db, 2, '3 hours')
    const t = await session()
    const r = await call({ action: 'sync' }, t)
    expect(r.status).toBe(200)
    expect(r.json.data.letters).toHaveLength(12)
    const l2 = r.json.data.letters[1]
    expect(l2.unlocked).toBe(false); expect(l2.body).toBeNull()
    expect(JSON.stringify(r.json)).not.toContain('Thank you for being mine')
  })
  it('opening a future letter returns 403 and records nothing', async () => {
    await shiftLetter(db, 2, '3 hours')
    const t = await session()
    const r = await call({ action: 'open_letter', messageId: await letterId(db, 2) }, t)
    expect(r.status).toBe(403); expect(r.json.error).toBe('letter_locked')
    expect((await db.query('select 1 from message_reads')).rows).toHaveLength(0)
  })
  it('opening twice (retry) records a single read and a single activity event', async () => {
    const t = await session(); const id = await letterId(db, 1)
    await call({ action: 'open_letter', messageId: id }, t)
    await call({ action: 'open_letter', messageId: id }, t)
    expect((await db.query('select 1 from message_reads')).rows).toHaveLength(1)
    expect((await db.query(`select 1 from activity_events where event_type='letter_opened'`)).rows).toHaveLength(1)
  })
  it('validates input shapes (bad uuid, bad emoji, huge body, unknown action)', async () => {
    const t = await session()
    expect((await call({ action: 'open_letter', messageId: 'nope' }, t)).status).toBe(400)
    expect((await call({ action: 'react', messageId: await letterId(db, 1), emoji: '💀', on: true }, t)).status).toBe(400)
    expect((await call({ action: 'post_note', body: 'x'.repeat(5000), clientRequestId: uid() }, t)).status).toBe(400)
    expect((await call({ action: 'post_note', body: 'x'.repeat(1001), clientRequestId: uid() }, t)).json.error).toBe('invalid_body')
    expect((await call({ action: 'post_note', body: 'a\u0000b', clientRequestId: uid() }, t)).status).toBe(400)
    expect((await call({ action: 'drop_tables' }, t)).status).toBe(400)
  })
  it('post_note is idempotent through the API', async () => {
    const t = await session(); const req = uid()
    await call({ action: 'post_note', body: 'hello', clientRequestId: req }, t)
    await call({ action: 'post_note', body: 'hello', clientRequestId: req }, t)
    expect((await db.query('select 1 from anniversary_notes')).rows).toHaveLength(1)
  })
  it('end-to-end: spin → pending → claim → spin again; planner proposal → partner confirms', async () => {
    const ahmed = await session('ahmed'); const laviza = await session('laviza')
    const spin = await call({ action: 'spin', clientRequestId: uid() }, ahmed)
    expect(spin.status).toBe(200)
    expect((await call({ action: 'spin', clientRequestId: uid() }, ahmed)).json.error).toBe('spin_pending')
    expect((await call({ action: 'resolve_spin', spinId: spin.json.data.spin_id, status: 'claimed' }, ahmed)).status).toBe(200)
    expect((await call({ action: 'spin', clientRequestId: uid() }, ahmed)).status).toBe(200)

    const prop = await call({ action: 'propose_plan', optionKeys: ['mood_cozy', 'act_cook'], startsAt: '2026-11-02T15:30:00.000Z', location: 'Home', playlistUrl: 'https://example.com/p' }, ahmed)
    expect(prop.status).toBe(200)
    const planId = prop.json.data.plan_id
    let sync = (await call({ action: 'sync' }, laviza)).json.data
    expect(sync.plans[0].status).toBe('proposed')
    await call({ action: 'confirm_plan', planId }, ahmed)
    expect((await call({ action: 'sync' }, ahmed)).json.data.plans[0].status).toBe('proposed')
    await call({ action: 'confirm_plan', planId }, laviza)
    sync = (await call({ action: 'sync' }, laviza)).json.data
    expect(sync.plans[0].status).toBe('confirmed')
    expect(sync.achievements.filter((a: any) => a.badge_key === 'plan_confirmed')).toHaveLength(2)
  })
  it('database errors do not leak internals', async () => {
    const t = await session()
    const r = await call({ action: 'set_preference', optionKey: 'x'.repeat(10), liked: true }, t)
    expect(r.status).toBe(400)
  })
  it('CORS preflight works and non-POST is refused', async () => {
    const pre = await handle(new Request('https://x.test/', { method: 'OPTIONS' }), deps())
    expect(pre.status).toBe(204)
    expect(pre.headers.get('access-control-allow-headers')).toContain('x-session-token')
    const get = await handle(new Request('https://x.test/', { method: 'GET' }), deps())
    expect(get.status).toBe(405)
    const restricted = await handle(new Request('https://x.test/', { method: 'OPTIONS' }), deps({ ALLOWED_ORIGIN: 'https://me.github.io' }))
    expect(restricted.headers.get('access-control-allow-origin')).toBe('https://me.github.io')
  })
})
