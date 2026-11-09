-- Blocking and reporting players.
-- A block works both ways and silently: neither player sees the other's open rounds in Find, can join a
-- round the other is playing in, send a friend request, or appear in the other's search or Home feed.
-- The blocked player is not told. Reports go to a table only the operator reads (Supabase dashboard).

create table blocks (
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on blocks (blocked_id);

alter table blocks enable row level security;
-- You see who you blocked, never who blocked you. Writes go through block_player / unblock_player.
create policy blocks_read on blocks for select to authenticated using (blocker_id = (select auth.uid()));
revoke all on blocks from anon;

create table reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid references profiles(id) on delete set null,
  reported_id    uuid references profiles(id) on delete set null,
  -- kept so the report still makes sense if the reported player deletes their account
  reported_name  text not null,
  round_id       uuid references rounds(id) on delete set null,
  reason         text not null check (reason in ('harassment', 'no_show', 'fake', 'inappropriate', 'other')),
  details        text check (char_length(details) <= 1000),
  status         text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at     timestamptz not null default now()
);
create index reports_open_idx on reports (created_at desc) where status = 'open';

-- No policies: players can't read or write reports directly, only through report_player.
alter table reports enable row level security;
revoke all on reports from anon, authenticated;

-- Everyone I blocked or who blocked me.
create function blocked_ids() returns setof uuid
language sql stable security definer set search_path = public as $$
  select blocked_id from blocks where blocker_id = auth.uid()
  union
  select blocker_id from blocks where blocked_id = auth.uid();
$$;

create function block_player(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r record;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_user = me then raise exception 'You can''t block yourself'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'Player not found'; end if;

  insert into blocks (blocker_id, blocked_id) values (me, p_user) on conflict do nothing;

  -- No longer friends, and any open request is gone
  update friendships set status = 'removed', accepted_at = null
   where least(requester_id, addressee_id) = least(me, p_user)
     and greatest(requester_id, addressee_id) = greatest(me, p_user);

  -- Out of my upcoming rounds (they aren't told; the spot just opens again)
  for r in
    select rp.round_id from round_players rp join rounds ro on ro.id = rp.round_id
     where ro.host_id = me and rp.player_id = p_user and rp.status in ('confirmed', 'requested')
       and ro.status in ('open', 'full') and ro.tee_time > now()
  loop
    update round_players set status = 'declined' where round_id = r.round_id and player_id = p_user;
    perform refresh_round_status(r.round_id);
  end loop;

  -- Their notifications to me go too
  delete from notifications where user_id = me and actor_id = p_user;
end $$;

create function unblock_player(p_user uuid) returns void
language sql security definer set search_path = public as $$
  delete from blocks where blocker_id = auth.uid() and blocked_id = p_user;
$$;

create function report_player(p_user uuid, p_reason text, p_details text default null, p_round_id uuid default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  their_name text;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_user = me then raise exception 'You can''t report yourself'; end if;
  select display_name into their_name from profiles where id = p_user;
  if not found then raise exception 'Player not found'; end if;
  if (select count(*) from reports where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Too many reports today';
  end if;

  insert into reports (reporter_id, reported_id, reported_name, round_id, reason, details)
  values (me, p_user, their_name, p_round_id, p_reason, nullif(trim(p_details), ''));
end $$;

-- Player search for adding friends, without blocked players
create function search_players(p_query text)
returns table (id uuid, display_name text, avatar_url text, handicap_index numeric)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.avatar_url, p.handicap_index
  from profiles p
  where p.onboarded
    and p.id <> auth.uid()
    and char_length(trim(p_query)) >= 2
    and p.display_name ilike '%' || replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
    and p.id not in (select blocked_ids())
  order by p.display_name
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Existing functions, now aware of blocks
-- ---------------------------------------------------------------------------

-- Find: skip rounds where anyone already in it is blocked either way
create or replace function find_rounds(
  p_lat double precision default null, p_lng double precision default null, p_radius_km double precision default 25,
  p_course_id uuid default null, p_from timestamptz default now(), p_to timestamptz default null)
returns table (round_id uuid, course_id uuid, course_name text, tee_time timestamptz, distance_km double precision,
               spots_left int, max_players smallint, host_id uuid, host_name text, host_handicap numeric, approve_requests boolean)
language sql stable set search_path = public, extensions as $$
  select
    r.id, c.id, c.name, r.tee_time,
    case when p_lat is null then null
         else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end,
    (r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')))::int,
    r.max_players,
    r.host_id, h.display_name, h.handicap_index, r.approve_requests
  from rounds r
  join courses  c on c.id = r.course_id
  join profiles h on h.id = r.host_id
  left join round_players rp on rp.round_id = r.id
  where r.status = 'open'
    and r.visibility = 'nearby'
    and r.host_id <> auth.uid()
    and r.tee_time >= coalesce(p_from, now())
    and (p_to is null or r.tee_time < p_to)
    and (p_course_id is null or r.course_id = p_course_id)
    and (p_lat is null or st_dwithin(c.location, st_point(p_lng, p_lat)::geography, p_radius_km * 1000))
    and not exists (
      select 1 from round_players me
      where me.round_id = r.id and me.player_id = auth.uid() and me.status in ('confirmed', 'requested')
    )
    and not exists (
      select 1 from round_players x
      where x.round_id = r.id and x.status in ('host', 'confirmed') and x.player_id in (select blocked_ids())
    )
  group by r.id, c.id, h.id
  having r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')) > 0
  order by r.tee_time
  limit 50;
$$;

create or replace function request_to_join(p_round_id uuid) returns player_status
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  current_status player_status;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found then raise exception 'Round not available'; end if;

  -- Already in (e.g. a double tap after the round filled up): nothing to do.
  select status into current_status from round_players where round_id = p_round_id and player_id = auth.uid();
  if current_status in ('host', 'confirmed') then return current_status; end if;

  if r.status <> 'open' then raise exception 'Round not available'; end if;
  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if r.visibility = 'invite_only' then raise exception 'Round is invite only'; end if;
  if exists (select 1 from round_players x where x.round_id = p_round_id and x.status in ('host', 'confirmed')
               and x.player_id in (select blocked_ids())) then
    raise exception 'Round not available';
  end if;
  if spots_left(p_round_id) <= 0 then raise exception 'Round is full'; end if;

  insert into round_players (round_id, player_id, status)
  values (p_round_id, auth.uid(), 'confirmed')
  on conflict (round_id, player_id) do update set status = 'confirmed';

  insert into notifications (user_id, type, round_id, actor_id)
  values (r.host_id, 'player_joined', p_round_id, auth.uid());

  perform refresh_round_status(p_round_id);
  return 'confirmed';
end $$;

create or replace function join_by_invite(p_invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  current_status player_status;
begin
  select * into r from rounds where invite_code = p_invite_code and status in ('open', 'full');
  if not found then raise exception 'Invite not found'; end if;

  select status into current_status from round_players where round_id = r.id and player_id = auth.uid();
  if current_status in ('host', 'confirmed') then return r.id; end if;

  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if exists (select 1 from round_players x where x.round_id = r.id and x.status in ('host', 'confirmed')
               and x.player_id in (select blocked_ids())) then
    raise exception 'Invite not found';
  end if;
  if spots_left(r.id) <= 0 then raise exception 'Round is full'; end if;
  insert into round_players (round_id, player_id, status) values (r.id, auth.uid(), 'confirmed')
    on conflict (round_id, player_id) do update set status = 'confirmed';
  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_joined', r.id, auth.uid());
  perform refresh_round_status(r.id);
  return r.id;
end $$;

-- A request to someone blocked either way looks sent, but nothing happens
create or replace function send_friend_request(p_user uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  f friendships;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_user = me then raise exception 'You can''t add yourself'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'Player not found'; end if;
  if p_user in (select blocked_ids()) then return 'pending'; end if;

  select * into f from friendships
   where least(requester_id, addressee_id) = least(me, p_user)
     and greatest(requester_id, addressee_id) = greatest(me, p_user)
   for update;

  if not found then
    insert into friendships (requester_id, addressee_id) values (me, p_user);
    insert into notifications (user_id, type, actor_id) values (p_user, 'friend_request', me);
    return 'pending';
  end if;

  if f.status = 'accepted' then return 'accepted'; end if;

  if f.status = 'pending' and f.addressee_id = me then
    update friendships set status = 'accepted', accepted_at = now()
     where requester_id = f.requester_id and addressee_id = f.addressee_id;
    insert into notifications (user_id, type, actor_id) values (p_user, 'friend_accepted', me);
    return 'accepted';
  end if;

  if f.status = 'pending' or (f.status = 'declined' and f.requester_id = me) then
    return 'pending';
  end if;

  update friendships
     set requester_id = me, addressee_id = p_user, status = 'pending', created_at = now(), accepted_at = null
   where requester_id = f.requester_id and addressee_id = f.addressee_id;
  insert into notifications (user_id, type, actor_id) values (p_user, 'friend_request', me);
  return 'pending';
end $$;

-- Home feed: same as 0012, without anything from or about blocked players
create or replace function home_feed(p_before timestamptz default null, p_limit int default 30)
returns table (
  kind text, at timestamptz,
  actor_id uuid, actor_name text, other_id uuid, other_name text,
  round_id uuid, scorecard_id uuid, course_name text, tee_time timestamptz, spots_left int,
  holes scorecard_holes, strokes int, to_par int, personal_best boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select auth.uid() as id),
  blocked as (select blocked_ids() as id),
  friends as (
    select case when f.requester_id = me.id then f.addressee_id else f.requester_id end as id
    from friendships f, me
    where f.status = 'accepted' and me.id in (f.requester_id, f.addressee_id)
  ),
  circle as (select id from friends union select id from me),
  cards as (
    select sp.profile_id, p.display_name, s.id as sid, s.holes, c.name as course, s.round_id,
           sum(sc.strokes)::int as strokes,
           (sum(sc.strokes) - sum(coalesce(ch.par, ch9.par, 4)))::int as to_par,
           max(sc.updated_at) as at
    from scorecard_players sp
    join profiles p on p.id = sp.profile_id
    join scorecards s on s.id = sp.scorecard_id
    join courses c on c.id = s.course_id
    join scores sc on sc.scorecard_player_id = sp.id
    left join course_holes ch on ch.course_id = s.course_id and ch.hole = sc.hole
    left join course_holes ch9 on ch9.course_id = s.course_id and ch9.hole = sc.hole - 9
         and not exists (select 1 from course_holes x where x.course_id = s.course_id and x.hole > 9)
    where sp.profile_id in (select id from circle)
    group by sp.profile_id, p.display_name, s.id, c.name
    having count(sc.hole) = case when s.holes = '18' then 18 else 9 end
  ),
  ranked as (
    select *, min(strokes) filter (where holes = '18') over (
             partition by profile_id order by at rows between unbounded preceding and 1 preceding) as prev_best
    from cards
  ),
  open_rounds as (
    select r.id, r.host_id, r.created_at, r.tee_time, c.name as course,
           r.max_players - (select count(*) from round_players x
                             where x.round_id = r.id and x.status in ('host', 'confirmed'))::int as spots_left
    from rounds r join courses c on c.id = r.course_id
    where r.visibility = 'nearby' and r.status in ('open', 'full') and r.tee_time > now()
  ),
  events as (
    select 'scorecard'::text as kind, k.at, k.profile_id as actor_id, k.display_name as actor_name,
           null::uuid as other_id, null::text as other_name,
           k.round_id, k.sid as scorecard_id, k.course as course_name, null::timestamptz as tee_time, null::int as spots_left,
           k.holes, k.strokes, k.to_par,
           (k.holes = '18' and k.prev_best is not null and k.strokes < k.prev_best) as personal_best
    from ranked k
    union all
    select 'round_posted', o.created_at, o.host_id, p.display_name, null, null,
           o.id, null, o.course, o.tee_time, o.spots_left, null, null, null, false
    from open_rounds o join profiles p on p.id = o.host_id
    where o.host_id in (select id from friends)
    union all
    select 'round_joined', rp.created_at, rp.player_id, p.display_name, null, null,
           o.id, null, o.course, o.tee_time, o.spots_left, null, null, null, false
    from round_players rp
    join open_rounds o on o.id = rp.round_id
    join profiles p on p.id = rp.player_id
    where rp.status = 'confirmed' and rp.player_id in (select id from friends)
    union all
    select 'new_friend', f.accepted_at,
           a.id, a.display_name, b.id, b.display_name,
           null, null, null, null, null, null, null, null, false
    from friendships f
    cross join me
    cross join lateral (select case when me.id in (f.requester_id, f.addressee_id) then me.id
                                    when f.addressee_id in (select id from friends) then f.addressee_id
                                    else f.requester_id end as actor) pick
    join profiles a on a.id = pick.actor
    join profiles b on b.id = case when pick.actor = f.requester_id then f.addressee_id else f.requester_id end
    where f.status = 'accepted'
      and (f.requester_id in (select id from circle) or f.addressee_id in (select id from circle))
  )
  select * from events
  where at < coalesce(p_before, 'infinity'::timestamptz)
    and actor_id not in (select id from blocked)
    and (other_id is null or other_id not in (select id from blocked))
  order by at desc
  limit least(greatest(p_limit, 1), 50);
$$;

revoke execute on function blocked_ids(), block_player(uuid), unblock_player(uuid),
  report_player(uuid, text, text, uuid), search_players(text) from public, anon;
grant execute on function block_player(uuid), unblock_player(uuid),
  report_player(uuid, text, text, uuid), search_players(text) to authenticated;
-- find_rounds runs with the caller's rights and needs this one
grant execute on function blocked_ids() to authenticated;
