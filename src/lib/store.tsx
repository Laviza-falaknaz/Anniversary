import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { RealtimeClient } from '@supabase/realtime-js'
import { api, ApiError } from './api'
import { CONFIG } from './config'
import { SITE, other, type Who } from '../content/site'
import type { SyncData } from './types'
import { useSession } from './session'

type Status = 'loading' | 'ready' | 'error'
interface Ctx {
  data: SyncData | null
  status: Status
  error: string | null
  who: Who
  live: boolean // realtime connected
  now: () => number // server-synchronised clock (ms)
  refresh: () => Promise<void>
  act: <T = unknown>(action: string, payload?: Record<string, unknown>) => Promise<T>
  unreadNotes: number
  newActivity: number
  markSeen: (what: 'notes' | 'activity') => Promise<void>
}
const DataCtx = createContext<Ctx | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { who: me } = useSession()
  const who = me as Who
  const [data, setData] = useState<SyncData | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const offset = useRef(0)
  const inflight = useRef<Promise<void> | null>(null)
  const dirty = useRef(false)

  const refresh = useCallback((): Promise<void> => {
    if (inflight.current) { dirty.current = true; return inflight.current }
    inflight.current = (async () => {
      try {
        const d = await api.call<SyncData>('sync')
        offset.current = Date.parse(d.now) - Date.now() // trust the server clock, not the device clock
        setData(d); setStatus('ready'); setError(null)
      } catch (e) {
        if (e instanceof ApiError && e.isAuth) return // session handler takes over
        setError(e instanceof ApiError && e.code === 'network' ? 'network' : 'server')
        setStatus((s) => (s === 'ready' ? 'ready' : 'error'))
      } finally {
        inflight.current = null
        if (dirty.current) { dirty.current = false; void refresh() }
      }
    })()
    return inflight.current
  }, [])

  const now = useCallback(() => Date.now() + offset.current, [])

  // first load, polling fallback, and wake-ups
  useEffect(() => {
    void refresh()
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, SITE.pollSeconds * 1000)
    const wake = () => { if (document.visibilityState === 'visible') void refresh() }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('focus', wake)
    window.addEventListener('online', wake)
    return () => {
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('focus', wake)
      window.removeEventListener('online', wake)
    }
  }, [refresh])

  // Supabase Realtime: the server broadcasts an empty "changed" ping; we re-fetch through the authenticated API.
  useEffect(() => {
    if (!CONFIG.configured || CONFIG.supabaseUrl.startsWith('http://')) return // local mock has no Realtime
    let timer: number | undefined
    let client: RealtimeClient | null = null
    try {
      client = new RealtimeClient(`${CONFIG.supabaseUrl.replace(/^http/, 'ws')}/realtime/v1`, { params: { apikey: CONFIG.anonKey } })
      const ch = client.channel('anniv')
      ch.on('broadcast', { event: 'changed' }, () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => void refresh(), 250)
      }).subscribe((s: string) => setLive(s === 'SUBSCRIBED'))
      client.connect()
    } catch { setLive(false) }
    return () => { window.clearTimeout(timer); try { client?.disconnect() } catch { /* ignore */ } }
  }, [refresh])

  // Letters unlock automatically: re-sync exactly when the next locked letter's time arrives.
  useEffect(() => {
    if (!data) return
    const next = data.letters.filter((l) => !l.unlocked).map((l) => Date.parse(l.unlock_at)).sort((a, b) => a - b)[0]
    if (next === undefined) return
    const wait = Math.max(300, next - now() + 400)
    const t = window.setTimeout(() => void refresh(), Math.min(wait, 2 ** 31 - 1))
    return () => window.clearTimeout(t)
  }, [data, now, refresh])

  const act = useCallback(async <T,>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
    const r = await api.call<T>(action, payload)
    void refresh()
    return r
  }, [refresh])

  const markSeen = useCallback(async (what: 'notes' | 'activity') => {
    try { await api.call('mark_seen', { what }); await refresh() } catch { /* non-critical */ }
  }, [refresh])

  const unreadNotes = useMemo(() => {
    if (!data) return 0
    const seen = Date.parse(data.seen.notes_seen_at)
    return data.notes.filter((n) => n.author === other(who) && Date.parse(n.created_at) > seen).length
  }, [data, who])
  const newActivity = useMemo(() => {
    if (!data) return 0
    const seen = Date.parse(data.seen.activity_seen_at)
    return data.activity.filter((a) => a.participant === other(who) && Date.parse(a.created_at) > seen).length
  }, [data, who])

  const value = useMemo<Ctx>(() => ({ data, status, error, who, live, now, refresh, act, unreadNotes, newActivity, markSeen }),
    [data, status, error, who, live, now, refresh, act, unreadNotes, newActivity, markSeen])
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>
}

export function useData(): Ctx {
  const c = useContext(DataCtx)
  if (!c) throw new Error('useData outside DataProvider')
  return c
}

/** Server-synchronised "now" that re-renders every `ms`. */
export function useNow(ms = 1000): number {
  const { now } = useData()
  const [t, setT] = useState(now())
  useEffect(() => { const i = window.setInterval(() => setT(now()), ms); return () => window.clearInterval(i) }, [now, ms])
  return t
}
