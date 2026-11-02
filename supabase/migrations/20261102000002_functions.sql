-- Server-side application functions. Only the service role (the Edge Function) may
-- execute them; see the REVOKE block at the end. Business rules live here so the
-- database itself enforces unlock times, idempotency and mutual confirmation.

-- ───────────── helpers ─────────────
create or replace function app_emit(
  p_who text, p_type text, p_ref_table text, p_ref_id uuid, p_detail text, p_key text
) returns boolean language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  insert into activity_events (participant, event_type, ref_table, ref_id, detail, dedupe_key)
  values (p_who, p_type, p_ref_table, p_ref_id, left(coalesce(p_detail, ''), 1000), p_key)
  on conflict (dedupe_key) do nothing;
  get diagnostics n = row_count;
  return n > 0;
end $$;

create or replace function app_clean_text(p_text text) returns text
language sql immutable set search_path = public as $$
  select btrim(regexp_replace(coalesce(p_text, ''), '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]', '', 'g'))
$$;

create or replace function app_grant(p_who text, p_badge text) returns void
language plpgsql security definer set search_path = public as $$
declare n integer; a uuid;
begin
  insert into achievements (participant, badge_key) values (p_who, p_badge)
  on conflict (participant, badge_key) do nothing returning id into a;
  if a is not null then
    perform app_emit(p_who, 'achievement_unlocked', 'achievements', a, p_badge,
                     'achievement:' || p_who || ':' || p_badge);
  end if;
end $$;

create or replace function app_award() returns void
language plpgsql security definer set search_path = public as $$
declare p text; n integer; both_notes boolean; confirmed boolean;
begin
  both_notes := exists (select 1 from anniversary_notes where author = 'laviza')
            and exists (select 1 from anniversary_notes where author = 'ahmed');
  confirmed := exists (select 1 from planner_plans where status = 'confirmed');
  foreach p in array array['laviza', 'ahmed'] loop
    select count(*) into n from message_reads where participant = p;
    if n >= 1 then perform app_grant(p, 'first_letter'); end if;
    if n >= 3 then perform app_grant(p, 'reader'); end if;
    if n >= 6 then perform app_grant(p, 'devoted_reader'); end if;
    if exists (select 1 from quiz_attempts where participant = p) then perform app_grant(p, 'quiz_done'); end if;
    if exists (select 1 from gift_spins where participant = p) then perform app_grant(p, 'gift_revealed'); end if;
    if exists (select 1 from wishes where author = p) then perform app_grant(p, 'wish_maker'); end if;
    if both_notes then perform app_grant(p, 'note_exchange'); end if;
    if confirmed then perform app_grant(p, 'plan_confirmed'); end if;
  end loop;
end $$;

-- ───────────── login throttling ─────────────
create or replace function app_login_status(p_ip_hash text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare fails integer; oldest timestamptz; global_fails integer; retry integer;
begin
  select count(*), min(attempted_at) into fails, oldest
    from login_attempts
   where ip_hash = p_ip_hash and not succeeded and attempted_at > now() - interval '10 minutes';
  select count(*) into global_fails
    from login_attempts where not succeeded and attempted_at > now() - interval '10 minutes';
  if fails >= 5 then
    retry := greatest(1, ceil(extract(epoch from (oldest + interval '10 minutes' - now())))::integer);
    return jsonb_build_object('locked', true, 'retry_after', retry, 'attempts_left', 0);
  end if;
  if global_fails >= 40 then
    return jsonb_build_object('locked', true, 'retry_after', 60, 'attempts_left', 0);
  end if;
  return jsonb_build_object('locked', false, 'retry_after', 0, 'attempts_left', 5 - fails);
end $$;

create or replace function app_login_record(p_ip_hash text, p_ok boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into login_attempts (ip_hash, succeeded) values (p_ip_hash, p_ok);
  delete from login_attempts where attempted_at < now() - interval '1 day';
  if p_ok then
    delete from login_attempts where ip_hash = p_ip_hash and not succeeded;
  end if;
end $$;

-- ───────────── letters ─────────────
create or replace function app_open_letter(p_who participant_name, p_message uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m anniversary_messages; n integer;
begin
  select * into m from anniversary_messages where id = p_message;
  if not found then raise exception 'letter_not_found'; end if;
  if m.unlock_at > now() then raise exception 'letter_locked'; end if;   -- server clock decides
  insert into message_reads (message_id, participant) values (m.id, p_who)
  on conflict (message_id, participant) do nothing;
  get diagnostics n = row_count;
  if n > 0 then
    perform app_emit(p_who, 'letter_opened', 'anniversary_messages', m.id,
                     'Letter ' || m.position || ': ' || m.title,
                     'letter_opened:' || p_who || ':' || m.id);
  end if;
  perform app_award();
  return jsonb_build_object('first_open', n > 0);
end $$;

create or replace function app_react(p_who participant_name, p_message uuid, p_emoji text, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare m anniversary_messages; n integer;
begin
  select * into m from anniversary_messages where id = p_message;
  if not found then raise exception 'letter_not_found'; end if;
  if m.unlock_at > now() then raise exception 'letter_locked'; end if;
  if p_on then
    insert into message_reactions (message_id, participant, emoji) values (m.id, p_who, p_emoji)
    on conflict (message_id, participant, emoji) do nothing;
    get diagnostics n = row_count;
    if n > 0 then
      perform app_emit(p_who, 'reaction_added', 'anniversary_messages', m.id,
                       p_emoji || ' on Letter ' || m.position || ': ' || m.title,
                       'reaction:' || p_who || ':' || m.id || ':' || p_emoji);
    end if;
  else
    delete from message_reactions where message_id = m.id and participant = p_who and emoji = p_emoji;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ───────────── notes ─────────────
create or replace function app_post_note(p_who participant_name, p_body text, p_message uuid, p_req uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare body text; m anniversary_messages; nid uuid; k text; detail text;
begin
  body := app_clean_text(p_body);
  detail := body;
  if char_length(body) < 1 or char_length(body) > 1000 then raise exception 'invalid_body'; end if;
  if p_message is not null then
    select * into m from anniversary_messages where id = p_message;
    if not found then raise exception 'letter_not_found'; end if;
    if m.unlock_at > now() then raise exception 'letter_locked'; end if;
    k := 'reply';
    detail := 'Reply to Letter ' || m.position || ': ' || body;
  else
    k := 'note';
  end if;
  insert into anniversary_notes (author, kind, message_id, body, client_request_id)
  values (p_who, k, p_message, body, p_req)
  on conflict (client_request_id) do nothing returning id into nid;
  if nid is null then   -- retry of an earlier request: return the original, emit nothing new
    select id into nid from anniversary_notes where client_request_id = p_req and author = p_who;
    if nid is null then raise exception 'conflict'; end if;
    return jsonb_build_object('id', nid, 'duplicate', true);
  end if;
  perform app_emit(p_who, case when k = 'reply' then 'reply_posted' else 'note_posted' end,
                   'anniversary_notes', nid,
                   detail, 'note:' || nid);
  perform app_award();
  return jsonb_build_object('id', nid, 'duplicate', false);
end $$;

create or replace function app_mark_seen(p_who participant_name, p_what text) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into participant_state (participant) values (p_who) on conflict do nothing;
  if p_what = 'notes' then
    update participant_state set notes_seen_at = now() where participant = p_who;
  elsif p_what = 'activity' then
    update participant_state set activity_seen_at = now() where participant = p_who;
  else
    raise exception 'invalid_request';
  end if;
end $$;

-- ───────────── gifts ─────────────
-- p_roll (0 <= roll < 1) exists only so the test-suite can force an outcome. The Edge
-- Function never passes it, and EXECUTE is revoked from every browser-facing role.
create or replace function app_spin(p_who participant_name, p_req uuid, p_roll double precision default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare existing gift_spins; total integer; target double precision; acc integer := 0;
        r gift_rewards; chosen text; sid uuid; spun timestamptz; lbl text;
begin
  select * into existing from gift_spins where client_request_id = p_req;
  if found then
    if existing.participant <> p_who then raise exception 'conflict'; end if;
    return jsonb_build_object('spin_id', existing.id, 'reward_key', existing.reward_key,
                              'spun_at', existing.spun_at, 'duplicate', true);
  end if;
  if exists (select 1 from gift_spins s where s.participant = p_who
               and not exists (select 1 from gift_claims c where c.spin_id = s.id)) then
    raise exception 'spin_pending';
  end if;
  select coalesce(sum(weight), 0) into total from gift_rewards where active;
  if total = 0 then raise exception 'no_rewards'; end if;
  target := coalesce(p_roll, random()) * total;
  for r in select * from gift_rewards where active order by sort_order, key loop
    acc := acc + r.weight;
    chosen := r.key;
    exit when target < acc;
  end loop;
  insert into gift_spins (participant, reward_key, client_request_id)
  values (p_who, chosen, p_req) returning id, spun_at into sid, spun;
  select label into lbl from gift_rewards where key = chosen;
  perform app_emit(p_who, 'gift_spun', 'gift_spins', sid, lbl, 'gift_spun:' || sid);
  perform app_award();
  return jsonb_build_object('spin_id', sid, 'reward_key', chosen, 'spun_at', spun, 'duplicate', false);
end $$;

create or replace function app_resolve_spin(p_who participant_name, p_spin uuid, p_status text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare s gift_spins; lbl text;
begin
  if p_status not in ('claimed', 'declined', 'swapped') then raise exception 'invalid_request'; end if;
  select * into s from gift_spins where id = p_spin;
  if not found then raise exception 'spin_not_found'; end if;
  insert into gift_claims (spin_id, status, decided_by) values (s.id, p_status, p_who)
  on conflict (spin_id) do update set status = excluded.status, decided_by = excluded.decided_by, decided_at = now();
  select label into lbl from gift_rewards where key = s.reward_key;
  perform app_emit(p_who, 'gift_resolved', 'gift_spins', s.id, lbl || ' → ' || p_status,
                   'gift_resolved:' || s.id || ':' || p_who || ':' || p_status);
  return jsonb_build_object('ok', true);
end $$;

-- ───────────── wishes ─────────────
create or replace function app_add_wish(p_who participant_name, p_category text, p_body text, p_req uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare body text; wid uuid;
begin
  body := app_clean_text(p_body);
  if char_length(body) < 1 or char_length(body) > 300 then raise exception 'invalid_body'; end if;
  if p_category not in ('together', 'date', 'gesture', 'future') then raise exception 'invalid_request'; end if;
  insert into wishes (author, category, body, client_request_id) values (p_who, p_category, body, p_req)
  on conflict (client_request_id) do nothing returning id into wid;
  if wid is null then
    select id into wid from wishes where client_request_id = p_req and author = p_who;
    if wid is null then raise exception 'conflict'; end if;
    return jsonb_build_object('id', wid, 'duplicate', true);
  end if;
  perform app_emit(p_who, 'wish_added', 'wishes', wid, '[' || p_category || '] ' || body, 'wish_added:' || wid);
  perform app_award();
  return jsonb_build_object('id', wid, 'duplicate', false);
end $$;

create or replace function app_update_wish(p_who participant_name, p_wish uuid, p_saved boolean, p_fulfilled boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare w wishes;
begin
  select * into w from wishes where id = p_wish;
  if not found then raise exception 'wish_not_found'; end if;
  update wishes set
    saved = coalesce(p_saved, saved),
    fulfilled_at = case when p_fulfilled is true then coalesce(fulfilled_at, now())
                        when p_fulfilled is false then null else fulfilled_at end,
    fulfilled_by = case when p_fulfilled is true then coalesce(fulfilled_by, p_who)
                        when p_fulfilled is false then null else fulfilled_by end
  where id = p_wish;
  if p_fulfilled is true and w.fulfilled_at is null then
    perform app_emit(p_who, 'wish_fulfilled', 'wishes', w.id, w.body, 'wish_fulfilled:' || w.id);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ───────────── quiz / misc events ─────────────
create or replace function app_submit_quiz(p_who participant_name, p_score integer, p_total integer, p_req uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare qid uuid;
begin
  if p_total is null or p_score is null or p_total < 1 or p_total > 50 or p_score < 0 or p_score > p_total then
    raise exception 'invalid_request';
  end if;
  insert into quiz_attempts (participant, score, total, client_request_id) values (p_who, p_score, p_total, p_req)
  on conflict (client_request_id) do nothing returning id into qid;
  if qid is null then return jsonb_build_object('duplicate', true); end if;
  perform app_emit(p_who, 'quiz_completed', 'quiz_attempts', qid, p_score || ' / ' || p_total, 'quiz:' || qid);
  perform app_award();
  return jsonb_build_object('duplicate', false);
end $$;

create or replace function app_log_event(p_who participant_name, p_kind text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k text;
begin
  k := left(app_clean_text(p_key), 120);
  if p_kind not in ('open_when_opened', 'adventure_finished') or char_length(k) = 0 then
    raise exception 'invalid_request';
  end if;
  perform app_emit(p_who, p_kind, null, null, k, p_kind || ':' || p_who || ':' || k);
  return jsonb_build_object('ok', true);
end $$;

-- ───────────── planner ─────────────
create or replace function app_set_preference(p_who participant_name, p_option text, p_liked boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o planner_options; n integer;
begin
  select * into o from planner_options where key = p_option and active;
  if not found then raise exception 'option_not_found'; end if;
  if p_liked then
    insert into planner_selections (option_key, participant) values (o.key, p_who)
    on conflict (option_key, participant) do nothing;
    get diagnostics n = row_count;
    if n > 0 then
      perform app_emit(p_who, 'planner_preference', 'planner_options', null, o.label,
                       'pref:' || p_who || ':' || o.key);
    end if;
  else
    delete from planner_selections where option_key = o.key and participant = p_who;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function app_propose_plan(
  p_who participant_name, p_options text[], p_starts timestamptz,
  p_location text, p_notes text, p_playlist text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare loc text; nts text; pl text; pid uuid; cnt integer; k text;
begin
  if p_options is null or cardinality(p_options) < 1 or cardinality(p_options) > 12 then
    raise exception 'invalid_plan';
  end if;
  if p_starts is null then raise exception 'invalid_plan'; end if;
  select count(distinct o.key) into cnt from planner_options o where o.key = any (p_options) and o.active;
  if cnt <> (select count(distinct x) from unnest(p_options) x) then raise exception 'option_not_found'; end if;
  loc := nullif(app_clean_text(p_location), '');
  nts := nullif(app_clean_text(p_notes), '');
  pl  := nullif(app_clean_text(p_playlist), '');
  if loc is not null and char_length(loc) > 120 then raise exception 'invalid_plan'; end if;
  if nts is not null and char_length(nts) > 500 then raise exception 'invalid_plan'; end if;
  if pl is not null and (pl !~ '^https?://[^\s]+$' or char_length(pl) > 300) then raise exception 'invalid_playlist'; end if;

  update planner_plans set status = 'superseded' where status = 'proposed';
  insert into planner_plans (status, proposed_by, starts_at, location, notes, playlist_url)
  values ('proposed', p_who, p_starts, loc, nts, pl) returning id into pid;
  for k in select distinct unnest(p_options) loop
    insert into planner_plan_items (plan_id, option_key) values (pid, k);
  end loop;
  insert into planner_plan_confirmations (plan_id, participant) values (pid, p_who);  -- proposer agrees to own proposal
  perform app_emit(p_who, 'plan_proposed', 'planner_plans', pid,
                   (select string_agg(o.label, ', ' order by o.sort_order) from planner_options o where o.key = any (p_options)),
                   'plan_proposed:' || pid);
  return jsonb_build_object('plan_id', pid);
end $$;

create or replace function app_confirm_plan(p_who participant_name, p_plan uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pl planner_plans; cnt integer;
begin
  select * into pl from planner_plans where id = p_plan for update;
  if not found then raise exception 'plan_not_found'; end if;
  if pl.status = 'confirmed' then
    return jsonb_build_object('status', 'confirmed');         -- idempotent retry
  end if;
  if pl.status <> 'proposed' then raise exception 'plan_not_pending'; end if;
  insert into planner_plan_confirmations (plan_id, participant) values (pl.id, p_who)
  on conflict (plan_id, participant) do nothing;
  select count(*) into cnt from planner_plan_confirmations where plan_id = pl.id;
  if cnt >= 2 then
    update planner_plans set status = 'superseded' where status = 'confirmed' and id <> pl.id;
    update planner_plans set status = 'confirmed', confirmed_at = now() where id = pl.id;
    perform app_emit(p_who, 'plan_confirmed', 'planner_plans', pl.id, 'Both confirmed', 'plan_confirmed:' || pl.id);
    perform app_award();
    return jsonb_build_object('status', 'confirmed');
  end if;
  return jsonb_build_object('status', 'proposed');
end $$;

-- ───────────── one payload for the UI ─────────────
create or replace function app_sync(p_who participant_name) returns jsonb
language plpgsql security definer set search_path = public as $$
declare result jsonb;
begin
  insert into participant_state (participant) values (p_who) on conflict do nothing;
  select jsonb_build_object(
    'now', now(),
    'letters', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.position) from (
        select m.id, m.position, m.purpose, m.teaser, m.unlock_at,
               (m.unlock_at <= now()) as unlocked,
               case when m.unlock_at <= now() then m.title end as title,
               case when m.unlock_at <= now() then m.body end as body,
               coalesce((select jsonb_agg(jsonb_build_object('who', r.participant, 'at', r.first_opened_at))
                           from message_reads r where r.message_id = m.id), '[]'::jsonb) as opened_by,
               coalesce((select jsonb_agg(jsonb_build_object('who', x.participant, 'emoji', x.emoji))
                           from message_reactions x where x.message_id = m.id), '[]'::jsonb) as reactions
          from anniversary_messages m) l), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(to_jsonb(n) order by n.created_at desc) from (
        select id, author, kind, message_id, body, created_at
          from anniversary_notes order by created_at desc limit 300) n), '[]'::jsonb),
    'seen', (select to_jsonb(s) from participant_state s where s.participant = p_who),
    'spins', coalesce((
      select jsonb_agg(to_jsonb(s) order by s.spun_at desc) from (
        select g.id, g.participant, g.reward_key, g.spun_at, c.status, c.decided_by, c.decided_at
          from gift_spins g left join gift_claims c on c.spin_id = g.id
         order by g.spun_at desc limit 100) s), '[]'::jsonb),
    'wishes', coalesce((
      select jsonb_agg(to_jsonb(w) order by w.created_at desc) from (
        select id, author, category, body, saved, fulfilled_at, fulfilled_by, created_at
          from wishes order by created_at desc limit 300) w), '[]'::jsonb),
    'quiz', coalesce((
      select jsonb_agg(to_jsonb(q) order by q.completed_at desc) from (
        select id, participant, score, total, completed_at from quiz_attempts
         order by completed_at desc limit 50) q), '[]'::jsonb),
    'preferences', coalesce((
      select jsonb_agg(jsonb_build_object('option_key', option_key, 'participant', participant))
        from planner_selections), '[]'::jsonb),
    'plans', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.created_at desc) from (
        select pl.id, pl.status, pl.proposed_by, pl.starts_at, pl.location, pl.notes, pl.playlist_url,
               pl.created_at, pl.confirmed_at,
               coalesce((select jsonb_agg(i.option_key order by i.option_key) from planner_plan_items i
                          where i.plan_id = pl.id), '[]'::jsonb) as option_keys,
               coalesce((select jsonb_agg(c.participant) from planner_plan_confirmations c
                          where c.plan_id = pl.id), '[]'::jsonb) as confirmed_by
          from planner_plans pl where pl.status in ('proposed', 'confirmed')) p), '[]'::jsonb),
    'achievements', coalesce((
      select jsonb_agg(jsonb_build_object('participant', participant, 'badge_key', badge_key, 'unlocked_at', unlocked_at))
        from achievements), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc) from (
        select id, participant, event_type, ref_table, ref_id, detail, created_at
          from activity_events order by created_at desc limit 300) e), '[]'::jsonb)
  ) into result;
  return result;
end $$;

-- ───────────── only the service role may call these ─────────────
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname like 'app\_%'
  loop
    execute format('revoke all on function %s from public', f.sig);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on function %s from authenticated', f.sig);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', f.sig);
    end if;
  end loop;
end $$;
