const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/+$/, '') ?? ''
const anon = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? ''

export const CONFIG = {
  supabaseUrl: url,
  anonKey: anon,
  functionUrl: `${url}/functions/v1/anniv`,
  /** false until real values are supplied via .env / GitHub Actions variables */
  configured: /^(https:\/\/[a-z0-9-]+\.supabase\.(co|in)|http:\/\/(localhost|127\.0\.0\.1):\d+)$/i.test(url) && anon.length > 10 && !/YOUR-/.test(url + anon),
}
