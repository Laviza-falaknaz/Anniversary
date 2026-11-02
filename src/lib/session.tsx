import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setApiToken, setOnExpired, type SessionInfo } from './api'
import type { Who } from '../content/site'

// The session token is a credential (not shared data), so it is kept in localStorage so the
// site still works when Ahmed reopens it later in the day. It expires server-side after 24h.
const KEY = 'anniv.session'

interface Ctx {
  who: Who | null
  authed: boolean
  notice: string | null
  login: (password: string) => Promise<void>
  identify: (who: Who) => Promise<void>
  logout: (notice?: string) => void
  switchPerson: () => void
}
const SessionCtx = createContext<Ctx | null>(null)

function load(): SessionInfo | null {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SessionInfo | null
    if (s && typeof s.token === 'string' && s.expiresAt > Date.now()) return s
  } catch { /* ignore */ }
  return null
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionInfo | null>(() => { const s = load(); if (s) setApiToken(s.token); return s })
  const [notice, setNotice] = useState<string | null>(null)

  const store = useCallback((s: SessionInfo | null) => {
    setApiToken(s?.token ?? '')
    setSession(s)
    try { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY) } catch { /* private mode */ }
  }, [])

  const logout = useCallback((n?: string) => { store(null); setNotice(n ?? null) }, [store])

  useEffect(() => { setOnExpired(() => logout('Your session has ended. Please sign in again.')); return () => setOnExpired(null) }, [logout])

  // sign out the moment the token expires, even if the tab was left open
  useEffect(() => {
    if (!session) return
    const ms = session.expiresAt - Date.now()
    const t = window.setTimeout(() => logout('Your session has ended. Please sign in again.'), Math.max(0, Math.min(ms, 2 ** 31 - 1)))
    return () => window.clearTimeout(t)
  }, [session, logout])

  const value = useMemo<Ctx>(() => ({
    who: session?.who ?? null,
    authed: !!session,
    notice,
    login: async (password) => { const s = await api.login(password); setNotice(null); store(s) },
    identify: async (who) => { store(await api.identify(who)) },
    logout,
    switchPerson: () => { if (session) store({ ...session, who: null }) },
  }), [session, notice, store, logout])

  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>
}

export function useSession(): Ctx {
  const c = useContext(SessionCtx)
  if (!c) throw new Error('useSession outside SessionProvider')
  return c
}
