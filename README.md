# Our Little World: a first-anniversary website

A romantic, interactive site for Laviza and Ahmed (2 November 2026). Letters unlock through the day, there is a gift wheel, a quiz, notes, a wish jar, and a shared date-night planner. Laviza can open the same site to see Ahmed's activity.

**Stack:** React + TypeScript + Vite + Tailwind (static, GitHub Pages) · Supabase Postgres (relational tables + RLS) · one Supabase Edge Function (`anniv`) for the password, sessions and all writes · updates arrive by polling every 10 s (no public Realtime channel is used).

## How it works (and what it does not do)

- The browser **never touches the database**. All tables have Row Level Security on with *no policies*, and every `app_*` SQL function is executable only by the service role. The only door is the `anniv` Edge Function.
- The password lives only in the Edge Function secret `APP_PASSWORD`. It is checked server-side (constant-time, case-insensitive, rate-limited: 5 wrong guesses / 10 min per address). A correct guess returns a signed, 24-hour session token.
- After the password, each person picks **Laviza** or **Ahmed**; the server puts that in the signed token and ignores any `who` sent in a request. This is **self-reported**: one shared password cannot prove who is typing.
- Letter text is stored in the database and released by the **database clock** only once `unlock_at` has passed. The text is not in the JavaScript bundle. Opening or reacting to a locked letter is refused by SQL.
- Activity timestamps are server-generated. Writes are idempotent (unique keys / client request ids).
- Private recipient-only notes are **intentionally omitted**: with a shared password, "private" would be fake privacy.
- Ambient music is on by default but only starts after the first tap/click (browsers block earlier); it can be switched off in Settings (gear icon).
- The session token is kept in `localStorage` (so Ahmed can come back during the day). Sound/motion preferences are too. No shared data is stored there.

## Project layout

```
src/content/      ← everything you edit: site.ts, schedule.ts, letters.ts, rewards.ts, planner.ts,
                    quiz.ts, bonus.ts, memories.ts, badges.ts
src/styles.css    ← colours + fonts (@theme block)
src/components/Cat.tsx  ← the Scottish Fold illustration
src/pages, src/lib      ← screens and logic
supabase/migrations/    ← schema + security + functions (run in order)
supabase/seed.sql       ← GENERATED from src/content by `npm run seed`
supabase/functions/anniv ← Edge Function (handler.ts is the logic)
scripts/                ← seed generator and a local fake backend
tests/                  ← unit, SQL and API tests
.github/workflows/deploy.yml
```

## Setup: exact steps

### 1. Supabase (backend)

1. Create a project at <https://supabase.com> (free tier is fine). Note the **Project URL**, the **anon / publishable key** (Settings → API) and the **project ref** (the `abcd…` part of the URL).
2. Install the CLI (`npm i -g supabase` or see supabase docs) and log in: `supabase login`.
3. From this repo: `supabase link --project-ref YOUR_REF`, then `supabase db push`. This applies both migrations. *(Or paste each file from `supabase/migrations/`, in order, into the Dashboard SQL editor.)*
4. Generate and load the content: `npm install && npm run seed`, then paste `supabase/seed.sql` into the SQL editor and run it. It is safe to re-run any time you edit letters, rewards or planner options.
5. Set secrets (the password is **not** in the repo):
   ```
   supabase secrets set APP_PASSWORD="the-password-from-your-brief" SESSION_SECRET="$(openssl rand -hex 32)"
   ```
   Optional: `ALLOWED_ORIGIN=https://laviza-falaknaz.github.io` (locks CORS to your site), `SESSION_TTL_HOURS=24`.
   `APP_PASSWORD` accepts several comma-separated values (e.g. `"spellingOne,spellingTwo"`). Your brief spelled the cat as *Livikzi* but the password differently, so consider accepting both spellings.
6. Deploy the function: `supabase functions deploy anniv --no-verify-jwt` (it uses its own signed tokens).

### 2. GitHub Pages (frontend)

1. Push this repo to `main` of `Laviza-falaknaz/Anniversary`.
2. Settings → Pages → **Source: GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables** tab → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (public values; no service-role key anywhere).
4. Re-run the workflow (Actions → Deploy to GitHub Pages → Run workflow). The site appears at `https://laviza-falaknaz.github.io/Anniversary/`.

### 3. Personalise (before Ahmed opens it)

- Search `[[ADD` in `src/content/` and replace each placeholder (they are highlighted on the page so you can find any you missed). To change letters **without code**, edit the `anniversary_messages` rows in the Supabase Table Editor.
- Unlock times: `src/content/schedule.ts`. The first letter is `immediate` and never lands in the future. Others are local Asia/Dubai times on 2 Nov 2026. Re-run `npm run seed` after changes.
- Set `showPlaceholderBadges: false` in `src/content/site.ts` when you're done.
- Photos for Memory Lane: put files in `public/memories/` and reference them in `src/content/memories.ts`.

## Using it

- **Ahmed:** open the site → enter the password (the cat is the hint) → tap **Ahmed**. Letters unlock by themselves; he can react, reply, leave notes, spin the wheel, play, and plan tonight.
- **You:** open the same URL on your device → password → tap **Laviza** → the pulse icon (top right) opens **Activity**, defaulting to what Ahmed has done (letters opened, reactions, replies, notes, spins, wishes, quiz, planner, badges), with filters and a "New" marker.

## Local development

```
npm install
npm run dev:local        # terminal 1: runs the REAL handler + SQL on an in-memory Postgres (PGlite), password dev-password
VITE_SUPABASE_URL=http://localhost:54321 VITE_SUPABASE_ANON_KEY=local npm run dev   # terminal 2
DEMO_SHIFT=1 npm run dev:local   # optional: spreads unlock times around "now" so some letters are locked
npm test                 # all tests
npm run build
```

## Tests

`npm test` runs: timezone/unlock/late-visit/boundary logic; the real SQL migrations in Postgres (unlock enforcement, read persistence, idempotent events/notes/spins/wishes/quiz, reward recording, planner mutual confirmation, achievements, RLS and role privileges); the Edge Function handler end-to-end (login, rate limit, token tampering/expiry, identity-from-token, validation); content consistency; and UI accessibility basics.

## Known limitations

- Identity is self-reported (see above). Anyone with the password can pick either name.
- The wheel's randomness is Postgres `random()`: fair for a game, not cryptographic.
- Realtime is deliberately not used (a secure private channel would need Supabase Auth users, which this design avoids); updates take up to ~10 s. The Edge Function could not be exercised against a live Supabase project in the build environment; they are covered by tests against Postgres and the handler, but do a quick manual run-through after deploying.
- Quiz scores are computed in the browser (low stakes; the server only bounds-checks them).
- "Open when…" and adventure text ships in the public page (not time-locked).
