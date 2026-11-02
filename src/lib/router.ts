import { useEffect, useState } from 'react'

// Hash routing: works on GitHub Pages (project sub-path, refresh, deep links) with no server rewrites.
const read = () => {
  const h = window.location.hash.replace(/^#/, '') || '/'
  return h.startsWith('/') ? h : `/${h}`
}
export function useRoute(): string {
  const [path, setPath] = useState(read)
  useEffect(() => {
    const on = () => setPath(read())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return path
}
export const navigate = (path: string) => { window.location.hash = path }
export const href = (path: string) => `#${path}`
