// Supabase Edge Function entry point (Deno). All logic is in handler.ts.
// deno-lint-ignore-file no-explicit-any
import { createClient } from 'npm:@supabase/supabase-js@2'
import { handle } from './handler.ts'

declare const Deno: any

const url = Deno.env.get('SUPABASE_URL')!
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! // injected by Supabase, never sent to browsers
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })

async function rpc(fn: string, args: Record<string, unknown>) {
  const { data, error } = await db.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data
}

Deno.serve((req: Request) =>
  handle(req, {
    rpc,
    now: () => Date.now(),
    env: {
      APP_PASSWORD: Deno.env.get('APP_PASSWORD'),
      SESSION_SECRET: Deno.env.get('SESSION_SECRET'),
      SESSION_TTL_HOURS: Deno.env.get('SESSION_TTL_HOURS'),
      ALLOWED_ORIGIN: Deno.env.get('ALLOWED_ORIGIN'),
    },
  }),
)
