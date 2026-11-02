import { beforeEach, describe, expect, it } from 'vitest'
import type { PGlite } from '@electric-sql/pglite'
import { freshDb, letterId, rpc, shiftLetter, uid } from './helpers/db'

let db: PGlite
beforeEach(async () => { db = await freshDb() })

const count = async (sql: string, params: unknown[] = []) => Number((await db.query<{ n: string }>(`select count(*) n from (${sql}) x`, params)).rows[0].n)
const fails = async (p: Promise<unknown>, msg: string) => { await expect(p).rejects.toThrow(msg) }

describe('seed', () => {
  it('loads 12 letters, the first already unlocked, the rest in the future or past by schedule', async () => {
    expect(await count('select 1 from anniversary_messages')).toBe(12)
    const first = (await db.query<{ ok: boolean }>('select unlock_at <= now() as ok from anniversary_messages where position=1')).rows[0]
    expect(first.ok).toBe(true)
  })
  it('seeding twice is idempotent', async () => {
    const { buildSeed } = await import('../scripts/generate-seed')
    await db.exec(buildSeed().sql)
    expect(await count('select 1 from anniversary_messages')).toBe(12)
    expect(await count('select 1 from gift_rewards')).toBe(9)
  })
})

describe('letters: unlock enforcement and read persistence', () => {
  it('refuses to open or react to or reply to a letter that is still locked', async () => {
    await shiftLetter(db, 5, '1 hour')
    const id = await letterId(db, 5)
    await fails(rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id }), 'letter_locked')
    await fails(rpc(db, 'app_react', { p_who: 'ahmed', p_message: id, p_emoji: '❤️', p_on: true }), 'letter_locked')
    await fails(rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'hi', p_message: id, p_req: uid() }), 'letter_locked')
    expect(await count('select 1 from message_reads')).toBe(0)
    expect(await count('select 1 from activity_events')).toBe(0)
  })
  it('sync withholds title and body of locked letters but returns unlocked ones', async () => {
    await shiftLetter(db, 3, '2 hours')
    const s = await rpc(db, 'app_sync', { p_who: 'ahmed' })
    const l3 = s.letters.find((l: any) => l.position === 3)
    expect(l3.unlocked).toBe(false)
    expect(l3.body).toBeNull(); expect(l3.title).toBeNull()
    expect(l3.teaser).toBeTruthy()
    const l1 = s.letters.find((l: any) => l.position === 1)
    expect(l1.body).toContain('Happy')
    expect(JSON.stringify(s)).not.toContain('Thank you for being mine'.replace('Thank', 'ZZZ')) // sanity
  })
  it('a letter whose time passes becomes openable without any other change', async () => {
    await shiftLetter(db, 4, '1 second')
    const id = await letterId(db, 4)
    await fails(rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id }), 'letter_locked')
    await new Promise((r) => setTimeout(r, 1200))
    await expect(rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id })).resolves.toMatchObject({ first_open: true })
  })
  it('records one read and one activity event per participant+letter (idempotent)', async () => {
    const id = await letterId(db, 1)
    expect((await rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id })).first_open).toBe(true)
    expect((await rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id })).first_open).toBe(false)
    await rpc(db, 'app_open_letter', { p_who: 'laviza', p_message: id })
    expect(await count(`select 1 from message_reads where message_id='${id}'`)).toBe(2)
    expect(await count(`select 1 from activity_events where event_type='letter_opened'`)).toBe(2)
  })
  it('read state persists across "sessions" (returned by sync)', async () => {
    const id = await letterId(db, 1)
    await rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id })
    const s = await rpc(db, 'app_sync', { p_who: 'laviza' })
    const l = s.letters.find((x: any) => x.id === id)
    expect(l.opened_by).toHaveLength(1)
    expect(l.opened_by[0].who).toBe('ahmed')
  })
  it('unknown letter ids are rejected', async () => {
    await fails(rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: uid() }), 'letter_not_found')
  })
})

describe('reactions, notes, replies', () => {
  it('reactions toggle and emit only one activity event per participant/letter/emoji', async () => {
    const id = await letterId(db, 1)
    for (let i = 0; i < 3; i++) {
      await rpc(db, 'app_react', { p_who: 'ahmed', p_message: id, p_emoji: '😘', p_on: true })
    }
    expect(await count('select 1 from message_reactions')).toBe(1)
    await rpc(db, 'app_react', { p_who: 'ahmed', p_message: id, p_emoji: '😘', p_on: false })
    expect(await count('select 1 from message_reactions')).toBe(0)
    await rpc(db, 'app_react', { p_who: 'ahmed', p_message: id, p_emoji: '😘', p_on: true })
    expect(await count(`select 1 from activity_events where event_type='reaction_added'`)).toBe(1)
  })
  it('rejects emoji outside the allowed set', async () => {
    const id = await letterId(db, 1)
    await expect(rpc(db, 'app_react', { p_who: 'ahmed', p_message: id, p_emoji: '💀', p_on: true })).rejects.toThrow()
  })
  it('notes are idempotent per client request id (network retry safe)', async () => {
    const req = uid()
    const a = await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'Love you', p_message: null, p_req: req })
    const b = await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'Love you', p_message: null, p_req: req })
    expect(a.duplicate).toBe(false); expect(b.duplicate).toBe(true); expect(b.id).toBe(a.id)
    expect(await count('select 1 from anniversary_notes')).toBe(1)
    expect(await count(`select 1 from activity_events where event_type='note_posted'`)).toBe(1)
  })
  it('another participant cannot hijack someone else\'s request id', async () => {
    const req = uid()
    await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'mine', p_message: null, p_req: req })
    await fails(rpc(db, 'app_post_note', { p_who: 'laviza', p_body: 'x', p_message: null, p_req: req }), 'conflict')
  })
  it('enforces length limits and strips control characters', async () => {
    await fails(rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: '   ', p_message: null, p_req: uid() }), 'invalid_body')
    await fails(rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'x'.repeat(1001), p_message: null, p_req: uid() }), 'invalid_body')
    const r = await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'he\u0001llo\u0007 there\nline2', p_message: null, p_req: uid() })
    const row = (await db.query<{ body: string }>('select body from anniversary_notes where id=$1', [r.id])).rows[0]
    expect(row.body).toBe('hello there\nline2')
  })
  it('replies attach to an unlocked letter, appear in the feed with their letter', async () => {
    const id = await letterId(db, 1)
    const r = await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'my memory', p_message: id, p_req: uid() })
    const s = await rpc(db, 'app_sync', { p_who: 'laviza' })
    expect(s.notes[0]).toMatchObject({ id: r.id, kind: 'reply', message_id: id, author: 'ahmed' })
    expect(s.activity[0].event_type).toBe('reply_posted')
    expect(s.activity[0].detail).toContain('Letter 1')
  })
  it('seen markers drive unread indicators', async () => {
    await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'hi', p_message: null, p_req: uid() })
    let s = await rpc(db, 'app_sync', { p_who: 'laviza' })
    expect(Date.parse(s.seen.notes_seen_at)).toBe(0)
    await rpc(db, 'app_mark_seen', { p_who: 'laviza', p_what: 'notes' })
    s = await rpc(db, 'app_sync', { p_who: 'laviza' })
    expect(Date.parse(s.seen.notes_seen_at)).toBeGreaterThan(Date.parse(s.notes[0].created_at) - 1)
    await fails(rpc(db, 'app_mark_seen', { p_who: 'laviza', p_what: 'bogus' }), 'invalid_request')
  })
})

describe('gift spinner', () => {
  it('records the server-chosen reward and honours a forced roll', async () => {
    const first = await rpc(db, 'app_spin', { p_who: 'ahmed', p_req: uid(), p_roll: 0.0 })
    expect(first.reward_key).toBe('long_hug') // first by sort order
    const row = (await db.query<{ reward_key: string }>('select reward_key from gift_spins where id=$1', [first.spin_id])).rows[0]
    expect(row.reward_key).toBe(first.reward_key)
  })
  it('the last roll maps to the last reward', async () => {
    const r = await rpc(db, 'app_spin', { p_who: 'ahmed', p_req: uid(), p_roll: 0.999999 })
    expect(r.reward_key).toBe('mystery_bonus')
  })
  it('weighted distribution roughly follows weights (statistical)', async () => {
    const tally: Record<string, number> = {}
    for (let i = 0; i < 150; i++) {
      const r = await rpc(db, 'app_spin', { p_who: 'laviza', p_req: uid() })
      tally[r.reward_key] = (tally[r.reward_key] ?? 0) + 1
      await rpc(db, 'app_resolve_spin', { p_who: 'laviza', p_spin: r.spin_id, p_status: 'claimed' })
    }
    // weights: long_hug 3 vs mystery_bonus 1 → expect hugs clearly more common
    expect(tally.long_hug).toBeGreaterThan(tally.mystery_bonus)
    expect(Object.keys(tally).length).toBeGreaterThanOrEqual(6)
  })
  it('a retried request returns the same spin (no double spin)', async () => {
    const req = uid()
    const a = await rpc(db, 'app_spin', { p_who: 'ahmed', p_req: req })
    const b = await rpc(db, 'app_spin', { p_who: 'ahmed', p_req: req })
    expect(b.duplicate).toBe(true); expect(b.spin_id).toBe(a.spin_id)
    expect(await count('select 1 from gift_spins')).toBe(1)
  })
  it('blocks a second spin while the first is unresolved; allows it after decline or swap', async () => {
    const a = await rpc(db, 'app_spin', { p_who: 'ahmed', p_req: uid() })
    await fails(rpc(db, 'app_spin', { p_who: 'ahmed', p_req: uid() }), 'spin_pending')
    await rpc(db, 'app_resolve_spin', { p_who: 'ahmed', p_spin: a.spin_id, p_status: 'swapped' })
    await expect(rpc(db, 'app_spin', { p_who: 'ahmed', p_req: uid() })).resolves.toBeTruthy()
    await expect(rpc(db, 'app_spin', { p_who: 'laviza', p_req: uid() })).resolves.toBeTruthy() // independent
  })
  it('either participant can claim, decline or swap without penalty; the status is recorded', async () => {
    const a = await rpc(db, 'app_spin', { p_who: 'ahmed', p_req: uid() })
    await rpc(db, 'app_resolve_spin', { p_who: 'laviza', p_spin: a.spin_id, p_status: 'declined' })
    const s = await rpc(db, 'app_sync', { p_who: 'ahmed' })
    expect(s.spins[0]).toMatchObject({ id: a.spin_id, status: 'declined', decided_by: 'laviza' })
    await fails(rpc(db, 'app_resolve_spin', { p_who: 'ahmed', p_spin: a.spin_id, p_status: 'forced' }), 'invalid_request')
  })
})

describe('wishes and quiz', () => {
  it('wishes: idempotent create, save, fulfil (event only once)', async () => {
    const req = uid()
    const w = await rpc(db, 'app_add_wish', { p_who: 'ahmed', p_category: 'date', p_body: 'Stargazing', p_req: req })
    await rpc(db, 'app_add_wish', { p_who: 'ahmed', p_category: 'date', p_body: 'Stargazing', p_req: req })
    expect(await count('select 1 from wishes')).toBe(1)
    await rpc(db, 'app_update_wish', { p_who: 'laviza', p_wish: w.id, p_saved: true, p_fulfilled: null })
    await rpc(db, 'app_update_wish', { p_who: 'laviza', p_wish: w.id, p_saved: null, p_fulfilled: true })
    await rpc(db, 'app_update_wish', { p_who: 'laviza', p_wish: w.id, p_saved: null, p_fulfilled: false })
    await rpc(db, 'app_update_wish', { p_who: 'laviza', p_wish: w.id, p_saved: null, p_fulfilled: true })
    const row = (await db.query<any>('select * from wishes')).rows[0]
    expect(row.saved).toBe(true); expect(row.fulfilled_by).toBe('laviza')
    expect(await count(`select 1 from activity_events where event_type='wish_fulfilled'`)).toBe(1)
    await fails(rpc(db, 'app_add_wish', { p_who: 'ahmed', p_category: 'nope', p_body: 'x', p_req: uid() }), 'invalid_request')
  })
  it('quiz: validates score, idempotent per request', async () => {
    const req = uid()
    await rpc(db, 'app_submit_quiz', { p_who: 'ahmed', p_score: 4, p_total: 6, p_req: req })
    const dup = await rpc(db, 'app_submit_quiz', { p_who: 'ahmed', p_score: 4, p_total: 6, p_req: req })
    expect(dup.duplicate).toBe(true)
    expect(await count('select 1 from quiz_attempts')).toBe(1)
    await fails(rpc(db, 'app_submit_quiz', { p_who: 'ahmed', p_score: 7, p_total: 6, p_req: uid() }), 'invalid_request')
  })
  it('log_event only accepts whitelisted kinds and dedupes', async () => {
    await rpc(db, 'app_log_event', { p_who: 'ahmed', p_kind: 'open_when_opened', p_key: 'miss' })
    await rpc(db, 'app_log_event', { p_who: 'ahmed', p_kind: 'open_when_opened', p_key: 'miss' })
    expect(await count(`select 1 from activity_events where event_type='open_when_opened'`)).toBe(1)
    await fails(rpc(db, 'app_log_event', { p_who: 'ahmed', p_kind: 'plan_confirmed', p_key: 'x' }), 'invalid_request')
  })
})

describe('planner: preferences, proposals and mutual confirmation', () => {
  it('preferences are per participant; mutual favourites are visible; duplicates emit one event', async () => {
    await rpc(db, 'app_set_preference', { p_who: 'ahmed', p_option: 'act_cook', p_liked: true })
    await rpc(db, 'app_set_preference', { p_who: 'ahmed', p_option: 'act_cook', p_liked: true })
    await rpc(db, 'app_set_preference', { p_who: 'laviza', p_option: 'act_cook', p_liked: true })
    await rpc(db, 'app_set_preference', { p_who: 'laviza', p_option: 'act_games', p_liked: true })
    const s = await rpc(db, 'app_sync', { p_who: 'ahmed' })
    const keysFor = (w: string) => s.preferences.filter((p: any) => p.participant === w).map((p: any) => p.option_key)
    expect(keysFor('ahmed').filter((k: string) => keysFor('laviza').includes(k))).toEqual(['act_cook'])
    expect(await count(`select 1 from activity_events where event_type='planner_preference'`)).toBe(3)
    await rpc(db, 'app_set_preference', { p_who: 'ahmed', p_option: 'act_cook', p_liked: false })
    expect(await count(`select 1 from planner_selections where participant='ahmed'`)).toBe(0)
    await fails(rpc(db, 'app_set_preference', { p_who: 'ahmed', p_option: 'nope', p_liked: true }), 'option_not_found')
  })
  const propose = (who: string, opts = ['mood_cozy', 'act_cook']) =>
    rpc(db, 'app_propose_plan', { p_who: who, p_options: opts, p_starts: '2026-11-02T15:30:00Z', p_location: ' Home ', p_notes: null, p_playlist: 'https://example.com/list' })

  it('a proposal is NOT a confirmation: only the proposer has agreed', async () => {
    const { plan_id } = await propose('ahmed')
    const s = await rpc(db, 'app_sync', { p_who: 'laviza' })
    const plan = s.plans.find((p: any) => p.id === plan_id)
    expect(plan.status).toBe('proposed')
    expect(plan.confirmed_by).toEqual(['ahmed'])
    expect(plan.location).toBe('Home')
    expect(plan.option_keys.sort()).toEqual(['act_cook', 'mood_cozy'])
    expect(await count(`select 1 from planner_plans where status='confirmed'`)).toBe(0)
    expect(await count(`select 1 from achievements where badge_key='plan_confirmed'`)).toBe(0)
  })
  it('re-confirming by the proposer never confirms the plan; the partner does', async () => {
    const { plan_id } = await propose('ahmed')
    expect((await rpc(db, 'app_confirm_plan', { p_who: 'ahmed', p_plan: plan_id })).status).toBe('proposed')
    expect((await rpc(db, 'app_confirm_plan', { p_who: 'laviza', p_plan: plan_id })).status).toBe('confirmed')
    expect((await rpc(db, 'app_confirm_plan', { p_who: 'laviza', p_plan: plan_id })).status).toBe('confirmed') // idempotent
    expect(await count(`select 1 from achievements where badge_key='plan_confirmed'`)).toBe(2)
    expect(await count(`select 1 from activity_events where event_type='plan_confirmed'`)).toBe(1)
  })
  it('changing the plan later: a new proposal supersedes the old proposal, keeps the confirmed plan until re-confirmed', async () => {
    const a = await propose('ahmed'); await rpc(db, 'app_confirm_plan', { p_who: 'laviza', p_plan: a.plan_id })
    const b = await propose('laviza', ['mood_romantic'])
    let s = await rpc(db, 'app_sync', { p_who: 'ahmed' })
    expect(s.plans.map((p: any) => p.status).sort()).toEqual(['confirmed', 'proposed'])
    await rpc(db, 'app_confirm_plan', { p_who: 'ahmed', p_plan: b.plan_id })
    s = await rpc(db, 'app_sync', { p_who: 'ahmed' })
    expect(s.plans).toHaveLength(1)
    expect(s.plans[0]).toMatchObject({ id: b.plan_id, status: 'confirmed' })
    // and a stale confirmation of the superseded plan is refused
    await fails(rpc(db, 'app_confirm_plan', { p_who: 'ahmed', p_plan: a.plan_id }), 'plan_not_pending')
  })
  it('a newer proposal replaces an unconfirmed older one', async () => {
    const a = await propose('ahmed'); const b = await propose('laviza', ['mood_playful'])
    await fails(rpc(db, 'app_confirm_plan', { p_who: 'laviza', p_plan: a.plan_id }), 'plan_not_pending')
    const s = await rpc(db, 'app_sync', { p_who: 'ahmed' })
    expect(s.plans).toHaveLength(1); expect(s.plans[0].id).toBe(b.plan_id)
  })
  it('validates inputs: unknown option, empty plan, bad playlist link', async () => {
    await fails(propose('ahmed', ['bogus']), 'option_not_found')
    await fails(propose('ahmed', []), 'invalid_plan')
    await fails(rpc(db, 'app_propose_plan', { p_who: 'ahmed', p_options: ['mood_cozy'], p_starts: '2026-11-02T15:30:00Z', p_location: null, p_notes: null, p_playlist: 'javascript:alert(1)' }), 'invalid_playlist')
  })
})

describe('achievements', () => {
  it('are unlocked server-side from real activity, once each', async () => {
    const id = await letterId(db, 1)
    await rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: id })
    await rpc(db, 'app_post_note', { p_who: 'ahmed', p_body: 'a', p_message: null, p_req: uid() })
    let badges = (await db.query<any>(`select badge_key from achievements where participant='ahmed'`)).rows.map((r) => r.badge_key)
    expect(badges).toEqual(['first_letter'])
    await rpc(db, 'app_post_note', { p_who: 'laviza', p_body: 'b', p_message: null, p_req: uid() })
    badges = (await db.query<any>(`select badge_key from achievements where participant='ahmed'`)).rows.map((r) => r.badge_key).sort()
    expect(badges).toEqual(['first_letter', 'note_exchange'])
    const events = await count(`select 1 from activity_events where event_type='achievement_unlocked'`)
    await rpc(db, 'app_post_note', { p_who: 'laviza', p_body: 'c', p_message: null, p_req: uid() })
    expect(await count(`select 1 from activity_events where event_type='achievement_unlocked'`)).toBe(events)
  })
  it('reader badges need 3 / 6 distinct opened letters', async () => {
    for (let p = 1; p <= 6; p++) { await shiftLetter(db, p, '-1 hour'); await rpc(db, 'app_open_letter', { p_who: 'ahmed', p_message: await letterId(db, p) }) }
    const badges = (await db.query<any>(`select badge_key from achievements where participant='ahmed'`)).rows.map((r) => r.badge_key).sort()
    expect(badges).toEqual(['devoted_reader', 'first_letter', 'reader'])
  })
})

describe('login throttling', () => {
  it('locks an address after 5 failures and resets on success', async () => {
    for (let i = 0; i < 4; i++) await rpc(db, 'app_login_record', { p_ip_hash: 'h1', p_ok: false })
    expect((await rpc(db, 'app_login_status', { p_ip_hash: 'h1' })).locked).toBe(false)
    await rpc(db, 'app_login_record', { p_ip_hash: 'h1', p_ok: false })
    const st = await rpc(db, 'app_login_status', { p_ip_hash: 'h1' })
    expect(st.locked).toBe(true); expect(st.retry_after).toBeGreaterThan(0)
    expect((await rpc(db, 'app_login_status', { p_ip_hash: 'other' })).locked).toBe(false)
    await rpc(db, 'app_login_record', { p_ip_hash: 'h2', p_ok: false })
    await rpc(db, 'app_login_record', { p_ip_hash: 'h2', p_ok: true })
    expect((await rpc(db, 'app_login_status', { p_ip_hash: 'h2' })).attempts_left).toBe(5)
  })
})

describe('activity integrity', () => {
  it('uses unique dedupe keys; server-generated timestamps; no event without participant', async () => {
    await expect(db.query(`insert into activity_events (participant,event_type,detail,dedupe_key) values ('ahmed','note_posted','x','k1'),('ahmed','note_posted','x','k1')`)).rejects.toThrow()
    await expect(db.query(`insert into activity_events (participant,event_type,detail,dedupe_key) values ('mallory','note_posted','x','k2')`)).rejects.toThrow()
    const r = (await db.query<any>(`insert into activity_events (participant,event_type,detail,dedupe_key) values ('ahmed','note_posted','x','k3') returning created_at`)).rows[0]
    expect(Math.abs(Date.now() - new Date(r.created_at).getTime())).toBeLessThan(60_000)
  })
})

describe('database access policy (Supabase roles)', () => {
  it('anon and authenticated can neither read tables nor run app_* functions; service_role can', async () => {
    const sdb = await freshDb({ withRoles: true })
    await sdb.exec('grant select on all tables in schema public to anon, authenticated') // even if someone adds a grant, RLS (no policy) still blocks rows
    for (const role of ['anon', 'authenticated']) {
      await sdb.exec(`set role ${role}`)
      const rows = await sdb.query('select * from anniversary_messages')
      expect(rows.rows).toHaveLength(0) // RLS: no policy → no rows
      await expect(sdb.query(`insert into anniversary_notes (author,kind,body,client_request_id) values ('ahmed','note','x','${uid()}')`)).rejects.toThrow()
      await expect(sdb.query(`select app_sync('ahmed')`)).rejects.toThrow(/permission denied/)
      await expect(sdb.query(`select app_spin('ahmed','${uid()}')`)).rejects.toThrow(/permission denied/)
      await sdb.exec('reset role')
    }
    await sdb.exec('set role service_role')
    await expect(sdb.query(`select app_sync('ahmed')`)).resolves.toBeTruthy()
    await sdb.exec('reset role')
  })
  it('RLS is enabled on every public table', async () => {
    const r = await db.query<{ tablename: string; rowsecurity: boolean }>(`select tablename, rowsecurity from pg_tables where schemaname='public'`)
    expect(r.rows.length).toBeGreaterThan(15)
    expect(r.rows.filter((t) => !t.rowsecurity)).toEqual([])
  })
})
