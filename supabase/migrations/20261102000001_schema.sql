-- Anniversary app: relational schema.
-- Access model: every table has Row Level Security enabled and NO policies, and all
-- privileges are revoked from anon/authenticated. The browser never talks to tables.
-- It calls the `anniv` Edge Function, which validates a signed session token and then
-- calls the app_* functions below with the service role.

create domain participant_name as text check (value in ('laviza', 'ahmed'));

-- ───────────────────────── letters ─────────────────────────
create table anniversary_messages (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  position    integer not null unique check (position > 0),
  purpose     text not null,
  teaser      text not null,
  title       text not null,
  body        text not null,
  unlock_at   timestamptz not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index anniversary_messages_unlock_idx on anniversary_messages (unlock_at);

create table message_reads (
  id              uuid primary key default gen_random_uuid(),
  message_id      uuid not null references anniversary_messages (id) on delete cascade,
  participant     participant_name not null,
  first_opened_at timestamptz not null default now(),
  unique (message_id, participant)
);

create table message_reactions (
  id          uuid primary key default gen_random_uuid(),
  message_id  uuid not null references anniversary_messages (id) on delete cascade,
  participant participant_name not null,
  emoji       text not null check (emoji in ('❤️', '🥹', '😘', '😂', '🔥', '✨')),
  created_at  timestamptz not null default now(),
  unique (message_id, participant, emoji)
);

-- ───────────────────────── notes / replies ─────────────────────────
create table anniversary_notes (
  id                uuid primary key default gen_random_uuid(),
  author            participant_name not null,
  kind              text not null check (kind in ('note', 'reply')),
  message_id        uuid references anniversary_messages (id) on delete cascade,
  body              text not null check (char_length(body) between 1 and 1000),
  client_request_id uuid not null unique,
  created_at        timestamptz not null default now(),
  check ((kind = 'reply') = (message_id is not null))
);
create index anniversary_notes_created_idx on anniversary_notes (created_at desc);

create table participant_state (
  participant        participant_name primary key,
  notes_seen_at      timestamptz not null default 'epoch',
  activity_seen_at   timestamptz not null default 'epoch'
);

-- ───────────────────────── gifts ─────────────────────────
create table gift_rewards (
  key          text primary key,
  label        text not null,
  description  text not null,
  kind         text not null check (kind in ('surprise', 'wish', 'mutual')),
  weight       integer not null default 1 check (weight > 0),
  active       boolean not null default true,
  sort_order   integer not null default 0
);

create table gift_spins (
  id                uuid primary key default gen_random_uuid(),
  participant       participant_name not null,
  reward_key        text not null references gift_rewards (key),
  client_request_id uuid not null unique,
  spun_at           timestamptz not null default now()
);
create index gift_spins_participant_idx on gift_spins (participant, spun_at desc);

create table gift_claims (
  id          uuid primary key default gen_random_uuid(),
  spin_id     uuid not null unique references gift_spins (id) on delete cascade,
  status      text not null check (status in ('claimed', 'declined', 'swapped')),
  decided_by  participant_name not null,
  decided_at  timestamptz not null default now()
);

-- ───────────────────────── planner ─────────────────────────
create table planner_options (
  key         text primary key,
  category    text not null check (category in ('mood', 'activity', 'cuisine', 'extra')),
  label       text not null,
  description text not null default '',
  sort_order  integer not null default 0,
  active      boolean not null default true
);

create table planner_selections (
  id          uuid primary key default gen_random_uuid(),
  option_key  text not null references planner_options (key) on delete cascade,
  participant participant_name not null,
  created_at  timestamptz not null default now(),
  unique (option_key, participant)
);

create table planner_plans (
  id           uuid primary key default gen_random_uuid(),
  status       text not null check (status in ('proposed', 'confirmed', 'superseded')),
  proposed_by  participant_name not null,
  starts_at    timestamptz not null,
  location     text check (char_length(location) <= 120),
  notes        text check (char_length(notes) <= 500),
  playlist_url text check (playlist_url ~ '^https?://' and char_length(playlist_url) <= 300),
  created_at   timestamptz not null default now(),
  confirmed_at timestamptz
);
-- at most one open proposal and one confirmed plan at any time
create unique index planner_one_proposed on planner_plans ((true)) where status = 'proposed';
create unique index planner_one_confirmed on planner_plans ((true)) where status = 'confirmed';

create table planner_plan_items (
  plan_id    uuid not null references planner_plans (id) on delete cascade,
  option_key text not null references planner_options (key),
  primary key (plan_id, option_key)
);

create table planner_plan_confirmations (
  plan_id      uuid not null references planner_plans (id) on delete cascade,
  participant  participant_name not null,
  confirmed_at timestamptz not null default now(),
  primary key (plan_id, participant)
);

-- ───────────────────────── wishes / quiz / achievements ─────────────────────────
create table wishes (
  id                uuid primary key default gen_random_uuid(),
  author            participant_name not null,
  category          text not null check (category in ('together', 'date', 'gesture', 'future')),
  body              text not null check (char_length(body) between 1 and 300),
  saved             boolean not null default false,
  fulfilled_at      timestamptz,
  fulfilled_by      participant_name,
  client_request_id uuid not null unique,
  created_at        timestamptz not null default now()
);

create table quiz_attempts (
  id                uuid primary key default gen_random_uuid(),
  participant       participant_name not null,
  score             integer not null check (score >= 0),
  total             integer not null check (total between 1 and 50),
  client_request_id uuid not null unique,
  completed_at      timestamptz not null default now(),
  check (score <= total)
);

create table achievements (
  id          uuid primary key default gen_random_uuid(),
  participant participant_name not null,
  badge_key   text not null check (badge_key in
    ('first_letter', 'reader', 'devoted_reader', 'note_exchange', 'quiz_done',
     'gift_revealed', 'wish_maker', 'plan_confirmed')),
  unlocked_at timestamptz not null default now(),
  unique (participant, badge_key)
);

-- ───────────────────────── activity + login throttling ─────────────────────────
create table activity_events (
  id          uuid primary key default gen_random_uuid(),
  participant participant_name not null,
  event_type  text not null check (event_type in
    ('letter_opened', 'reaction_added', 'reply_posted', 'note_posted', 'gift_spun',
     'gift_resolved', 'wish_added', 'wish_fulfilled', 'quiz_completed',
     'planner_preference', 'plan_proposed', 'plan_confirmed', 'achievement_unlocked',
     'open_when_opened', 'adventure_finished')),
  ref_table   text,
  ref_id      uuid,
  detail      text not null default '' check (char_length(detail) <= 1000),
  dedupe_key  text not null unique,
  created_at  timestamptz not null default now()
);
create index activity_events_created_idx on activity_events (created_at desc);

create table login_attempts (
  id           bigint generated always as identity primary key,
  ip_hash      text not null,
  succeeded    boolean not null,
  attempted_at timestamptz not null default now()
);
create index login_attempts_lookup_idx on login_attempts (ip_hash, attempted_at desc);

-- ───────────────────────── lock everything down ─────────────────────────
do $$
declare t text;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon;
    revoke all on all sequences in schema public from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on all tables in schema public from authenticated;
    revoke all on all sequences in schema public from authenticated;
  end if;
end $$;
-- No policies are defined on purpose: with RLS on and no policy, anon/authenticated
-- can read and write nothing. The service role (Edge Function) bypasses RLS.
