// Local stand-in for Supabase so you can try the whole site without any account:
//   npm run dev:local        (in one terminal)   then   VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=local-dev-key npm run dev
// It runs the REAL Edge Function handler against an in-memory Postgres (PGlite) with the real migrations.
// Data lives only in memory. The password is "dev-password" unless APP_PASSWORD is set.
import { createServer } from 'node:http'
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { handle } from '../supabase/functions/anniv/handler'
import { buildSeed } from './generate-seed'

const PORT = Number(process.env.PORT ?? 54321)
const db = new PGlite()
const dir = new URL('../supabase/migrations/', import.meta.url)
for (const f of readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) await db.exec(readFileSync(new URL(f, dir), 'utf8'))
await db.exec(buildSeed().sql)

// DEMO_SHIFT=1 spreads unlock times around "now" so you can see locked and unlocked letters at any hour.
if (process.env.DEMO_SHIFT) {
  await db.exec(`update anniversary_messages set unlock_at = now() + ((position - 4) * interval '${process.env.DEMO_STEP ?? '20 minutes'}') where position > 1`)
}

const rpc = async (fn: string, args: Record<string, unknown>) => {
  const keys = Object.keys(args)
  const r = await db.query<{ r: unknown }>(`select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`, keys.map((k) => args[k]))
  return r.rows[0].r
}

createServer(async (req, res) => {
  const chunks: Buffer[] = []
  for await (const c of req) chunks.push(c as Buffer)
  const request = new Request(`http://localhost:${PORT}${req.url}`, {
    method: req.method, headers: req.headers as Record<string, string>,
    body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
  })
  const out = await handle(request, {
    rpc, now: () => Date.now(),
    env: { APP_PASSWORD: process.env.APP_PASSWORD ?? 'dev-password', SESSION_SECRET: 'local-dev-secret-not-for-production-use' },
  })
  res.writeHead(out.status, Object.fromEntries(out.headers))
  res.end(Buffer.from(await out.arrayBuffer()))
}).listen(PORT, () => console.log(`Local backend on http://localhost:${PORT}  (password: ${process.env.APP_PASSWORD ?? 'dev-password'})`))
