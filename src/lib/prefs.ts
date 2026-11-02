import { useSyncExternalStore } from 'react'

// Non-sensitive UI preferences only (sound, calm motion). Never used for shared data.
export interface Prefs { sfx: boolean; ambient: boolean; calm: boolean }
const KEY = 'anniv.prefs'
const defaults: Prefs = { sfx: true, ambient: false, calm: false }

function load(): Prefs {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') } } catch { return defaults }
}
let state: Prefs = load()
const subs = new Set<() => void>()

export function setPrefs(p: Partial<Prefs>) {
  state = { ...state, ...p }
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* private mode */ }
  applyCalm()
  subs.forEach((f) => f())
}
export const getPrefs = () => state
export function usePrefs(): Prefs {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => state, () => defaults)
}
export function applyCalm() {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  document.documentElement.dataset.calm = String(state.calm || !!reduced)
}
export const isCalm = () => state.calm || (typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
