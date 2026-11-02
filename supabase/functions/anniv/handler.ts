// Request handling for the `anniv` Edge Function. Pure with respect to its
// dependencies (database RPC, env, clock) so it runs unchanged in Deno and in tests.
import { safeEqual, signToken, verifyToken, type Claims } from './jwt.ts'

export interface Deps {
  /** Calls a Postgres function through the service role. */
  rpc: (fn: string, args: Record<string, unknown>) => Promise<unknown>
  env: {
    APP_PASSWORD?: string // one or more accepted passwords, comma-separated
    SESSION_SECRET?: string
    SESSION_TTL_HOURS?: string
    ALLOWED_ORIGIN?: string
  }
  now: () => number
  /** Pause after a wrong password (ms). Default 1000. */
  wrongGuessDelayMs?: number
}

class HttpError extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) {
    super(code)
  }
}

const WHO = ['laviza', 'ahmed'] as const
const EMOJI = ['❤️', '🥹', '😘', '😂', '🔥', '✨']
const WISH_CATEGORIES = ['together', 'date', 'gesture', 'future']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Postgres exception messages raised by app_* functions -> HTTP status
const DB_ERRORS: Record<string, number> = {
  letter_locked: 403,
  letter_not_found: 404,
  spin_not_found: 404,
  wish_not_found: 404,
  plan_not_found: 404,
  option_not_found: 400,
  spin_pending: 409,
  plan_not_pending: 409,
  conflict: 409,
  invalid_body: 400,
  invalid_request: 400,
  invalid_plan: 400,
  invalid_playlist: 400,
  no_rewards: 500,
}


function cors(env: Deps['env']): Record<string, string> {
  return {
    'access-control-allow-origin': env.ALLOWED_ORIGIN || '*',
    'access-control-allow-headers': 'content-type, x-session-token, apikey, authorization, x-client-info',
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function json(body: unknown, status: number, env: Deps['env']): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...cors(env) },
  })
}

function str(v: unknown, max: number): string {
  if (typeof v !== 'string' || v.length > max || v.includes('\u0000')) throw new HttpError(400, 'invalid_request')
  return v
}
function uuid(v: unknown): string {
  if (typeof v !== 'string' || !UUID.test(v)) throw new HttpError(400, 'invalid_request')
  return v
}
function bool(v: unknown): boolean {
  if (typeof v !== 'boolean') throw new HttpError(400, 'invalid_request')
  return v
}
function optBool(v: unknown): boolean | null {
  return v === undefined || v === null ? null : bool(v)
}
function int(v: unknown, min: number, max: number): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < min || v > max) throw new HttpError(400, 'invalid_request')
  return v
}

function ttlSeconds(env: Deps['env']): number {
  const h = Number(env.SESSION_TTL_HOURS)
  return Math.round((Number.isFinite(h) && h > 0 && h <= 72 ? h : 24) * 3600)
}

export async function handle(req: Request, deps: Deps): Promise<Response> {
  const { env } = deps
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(env) })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, env)

  try {
    const secret = env.SESSION_SECRET
    const passwords = (env.APP_PASSWORD ?? '').split(',').map((p) => p.trim()).filter(Boolean)
    if (!secret || secret.length < 16 || passwords.length === 0) throw new HttpError(500, 'server_not_configured')

    const text = await req.text()
    if (text.length > 20_000) throw new HttpError(413, 'too_large')
    let body: Record<string, unknown>
    try {
      body = JSON.parse(text || '{}')
      if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error()
    } catch {
      throw new HttpError(400, 'invalid_json')
    }
    const action = body.action
    if (typeof action !== 'string') throw new HttpError(400, 'invalid_request')

    // ───── login: the only unauthenticated action ─────
    if (action === 'login') {
      // No lockout: the correct password always works. Wrong guesses only cost a short delay,
      // which slows brute-forcing without ever locking a real user out.
      const given = str(body.password, 200).trim().toLowerCase()
      let ok = false
      for (const p of passwords) ok = (await safeEqual(given, p.toLowerCase())) || ok
      if (!ok) {
        await new Promise((r) => setTimeout(r, deps.wrongGuessDelayMs ?? 1000))
        throw new HttpError(401, 'wrong_password')
      }
      return json(await issue(deps, undefined), 200, env)
    }

    // ───── everything else needs a valid, unexpired token ─────
    const token = req.headers.get('x-session-token') ?? ''
    const claims = await verifyToken(token, secret, deps.now())
    if (!claims) throw new HttpError(401, 'invalid_session')

    if (action === 'identify') {
      const who = str(body.who, 10)
      if (!(WHO as readonly string[]).includes(who)) throw new HttpError(400, 'invalid_request')
      return json(await issue(deps, who as Claims['who']), 200, env)
    }
    if (action === 'ping') return json({ ok: true, who: claims.who ?? null, exp: claims.exp }, 200, env)

    // Participant identity comes from the signed token, never from the request body.
    const who = claims.who
    if (!who) throw new HttpError(403, 'identity_required')

    let result: unknown
    switch (action) {
      case 'sync':
        result = await deps.rpc('app_sync', { p_who: who })
        break
      case 'open_letter':
        result = await deps.rpc('app_open_letter', { p_who: who, p_message: uuid(body.messageId) })
        break
      case 'react': {
        const emoji = str(body.emoji, 8)
        if (!EMOJI.includes(emoji)) throw new HttpError(400, 'invalid_request')
        result = await deps.rpc('app_react', { p_who: who, p_message: uuid(body.messageId), p_emoji: emoji, p_on: bool(body.on) })
        break
      }
      case 'post_note':
        result = await deps.rpc('app_post_note', {
          p_who: who,
          p_body: str(body.body, 4000),
          p_message: body.messageId == null ? null : uuid(body.messageId),
          p_req: uuid(body.clientRequestId),
        })
        break
      case 'mark_seen': {
        const what = str(body.what, 10)
        if (what !== 'notes' && what !== 'activity') throw new HttpError(400, 'invalid_request')
        result = await deps.rpc('app_mark_seen', { p_who: who, p_what: what })
        break
      }
      case 'spin':
        result = await deps.rpc('app_spin', { p_who: who, p_req: uuid(body.clientRequestId) })
        break
      case 'resolve_spin': {
        const s = str(body.status, 10)
        if (!['claimed', 'declined', 'swapped'].includes(s)) throw new HttpError(400, 'invalid_request')
        result = await deps.rpc('app_resolve_spin', { p_who: who, p_spin: uuid(body.spinId), p_status: s })
        break
      }
      case 'add_wish': {
        const c = str(body.category, 20)
        if (!WISH_CATEGORIES.includes(c)) throw new HttpError(400, 'invalid_request')
        result = await deps.rpc('app_add_wish', { p_who: who, p_category: c, p_body: str(body.body, 2000), p_req: uuid(body.clientRequestId) })
        break
      }
      case 'update_wish':
        result = await deps.rpc('app_update_wish', {
          p_who: who, p_wish: uuid(body.wishId), p_saved: optBool(body.saved), p_fulfilled: optBool(body.fulfilled),
        })
        break
      case 'submit_quiz':
        result = await deps.rpc('app_submit_quiz', {
          p_who: who, p_score: int(body.score, 0, 50), p_total: int(body.total, 1, 50), p_req: uuid(body.clientRequestId),
        })
        break
      case 'log_event':
        result = await deps.rpc('app_log_event', { p_who: who, p_kind: str(body.kind, 40), p_key: str(body.key, 200) })
        break
      case 'set_preference':
        result = await deps.rpc('app_set_preference', { p_who: who, p_option: str(body.optionKey, 60), p_liked: bool(body.liked) })
        break
      case 'propose_plan': {
        const keys = body.optionKeys
        if (!Array.isArray(keys) || keys.length < 1 || keys.length > 12) throw new HttpError(400, 'invalid_plan')
        const startsAt = str(body.startsAt, 40)
        if (Number.isNaN(Date.parse(startsAt))) throw new HttpError(400, 'invalid_plan')
        result = await deps.rpc('app_propose_plan', {
          p_who: who,
          p_options: keys.map((k) => str(k, 60)),
          p_starts: new Date(startsAt).toISOString(),
          p_location: body.location == null ? null : str(body.location, 400),
          p_notes: body.notes == null ? null : str(body.notes, 1500),
          p_playlist: body.playlistUrl == null ? null : str(body.playlistUrl, 600),
        })
        break
      }
      case 'confirm_plan':
        result = await deps.rpc('app_confirm_plan', { p_who: who, p_plan: uuid(body.planId) })
        break
      default:
        throw new HttpError(400, 'unknown_action')
    }

    return json({ ok: true, data: result }, 200, env)
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.code, ...e.extra }, e.status, env)
    const msg = (e as { message?: string })?.message ?? ''
    if (msg in DB_ERRORS) return json({ error: msg }, DB_ERRORS[msg], env)
    console.error('anniv error', msg)
    return json({ error: 'server_error' }, 500, env)
  }
}

async function issue(deps: Deps, who: Claims['who']) {
  const iat = Math.floor(deps.now() / 1000)
  const exp = iat + ttlSeconds(deps.env)
  const claims: Claims = { sub: 'guest', iat, exp, ...(who ? { who } : {}) }
  return { token: await signToken(claims, deps.env.SESSION_SECRET!), expiresAt: exp * 1000, who: who ?? null }
}
