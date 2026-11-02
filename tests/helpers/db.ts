import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { buildSeed } from '../../scripts/generate-seed'

const MIGRATIONS = new URL('../../supabase/migrations/', import.meta.url)

/** A fresh in-memory Postgres with the real migrations and seed applied.
 *  `withRoles` creates Supabase-style anon/authenticated/service_role roles first. */
export async function freshDb(opts: { withRoles?: boolean } = {}): Promise<PGlite> {
  const db = new PGlite()
  if (opts.withRoles) {
    await db.exec(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin;
      grant usage on schema public to anon, authenticated, service_role;
    `)
  }
  for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(f, MIGRATIONS), 'utf8'))
  }
  await db.exec(buildSeed().sql)
  return db
}

/** Calls an app_* function the way the Edge Function does (named arguments). */
export async function rpc(db: PGlite, fn: string, args: Record<string, unknown> = {}): Promise<any> {
  const keys = Object.keys(args)
  const sql = `select ${fn}(${keys.map((k, i) => `${k} => $${i + 1}`).join(', ')}) as r`
  const res = await db.query<{ r: unknown }>(sql, keys.map((k) => args[k]))
  return res.rows[0].r
}

export const uid = () => crypto.randomUUID()

export async function letterId(db: PGlite, position: number): Promise<string> {
  return (await db.query<{ id: string }>('select id from anniversary_messages where position=$1', [position])).rows[0].id
}
/** Test helper: move a letter's unlock time relative to the database clock. */
export async function shiftLetter(db: PGlite, position: number, interval: string) {
  await db.query(`update anniversary_messages set unlock_at = now() + $1::interval where position = $2`, [interval, position])
}
