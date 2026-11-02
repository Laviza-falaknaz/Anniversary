import { CONFIG } from './config'

export class ApiError extends Error {
  constructor(public status: number, public code: string, public extra: Record<string, unknown> = {}) {
    super(code)
  }
  get isAuth() { return this.status === 401 && this.code === 'invalid_session' }
}

export interface SessionInfo { token: string; expiresAt: number; who: 'laviza' | 'ahmed' | null }

let currentToken = ''
let onExpired: (() => void) | null = null
export const setApiToken = (t: string) => { currentToken = t }
export const setOnExpired = (fn: (() => void) | null) => { onExpired = fn }

async function post<T>(body: Record<string, unknown>, retries = 1): Promise<T> {
  if (!CONFIG.configured) throw new ApiError(0, 'not_configured')
  let res: Response
  try {
    res = await fetch(CONFIG.functionUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: CONFIG.anonKey, ...(currentToken ? { 'x-session-token': currentToken } : {}) },
      body: JSON.stringify(body),
    })
  } catch {
    if (retries > 0) { await new Promise((r) => setTimeout(r, 600)); return post<T>(body, retries - 1) }
    throw new ApiError(0, 'network')
  }
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
  if (!res.ok) {
    const err = new ApiError(res.status, String(json.error ?? 'server_error'), json)
    if (err.isAuth) onExpired?.()
    throw err
  }
  return json as T
}

export const api = {
  login: (password: string) => post<SessionInfo>({ action: 'login', password }),
  identify: (who: 'laviza' | 'ahmed') => post<SessionInfo>({ action: 'identify', who }),
  ping: () => post<{ ok: true }>({ action: 'ping' }),
  /** Mutating calls are idempotent on the server (clientRequestId / unique keys), so one automatic retry is safe. */
  call: async <T = unknown>(action: string, payload: Record<string, unknown> = {}): Promise<T> =>
    (await post<{ ok: true; data: T }>({ action, ...payload })).data,
}

export const newId = (): string => crypto.randomUUID()

const MESSAGES: Record<string, string> = {
  not_configured: 'The site is not connected to its backend yet.',
  network: "Can't reach the server. Check your connection and try again.",
  wrong_password: "That's not quite it. Think of someone with folded ears…",
  rate_limited: 'Too many guesses. Take a breath and try again shortly.',
  invalid_session: 'Your session has ended. Please sign in again.',
  letter_locked: "That letter isn't ready yet.",
  spin_pending: 'Decide what to do with your last spin first.',
  plan_not_pending: 'That plan was just changed. Have a look at the latest one.',
  invalid_body: 'That message is empty or too long.',
  invalid_playlist: 'Playlist links must start with http:// or https://',
  invalid_plan: 'The plan is missing something. Pick at least one thing and a start time.',
  server_error: 'Something went wrong on our side. Please try again.',
}
export const explain = (e: unknown): string => {
  if (e instanceof ApiError) return MESSAGES[e.code] ?? 'Something went wrong. Please try again.'
  return 'Something went wrong. Please try again.'
}
