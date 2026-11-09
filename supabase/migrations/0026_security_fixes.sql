-- Fixes from the security test on 2026-11-09 (attacks run as a normal signed-in player).
--  1. Invite codes: only the host (and, when no approval is needed, confirmed players) can read them,
--     so nobody can skip "Approve requests"; a declined player who uses the link asks again instead.
--     New codes are 16 characters instead of 8.
--  2. "Free to play" spots are stored rounded to about 1 km and distances are shown in whole km,
--     so a player's exact (home) location can't be worked out.
--  3. The same notification (same sender, type and round) is sent at most once an hour,
--     so joining/leaving or friending/unfriending in a loop can't spam someone.
--  4. Rounds: tee time in the future (within a year), and at most 10 new rounds a day per player.
--  5. Pars that came from the course data (OpenStreetMap) can't be changed by players.
--  6. Size limits on course names and profile lists.
--  7. Housekeeping: a leftover test function, and rls_auto_enable not callable through the API.


-- 1. Invite codes -------------------------------------------------------------------------------

-- Every column of rounds except invite_code. A new column on rounds must be added here too.
revoke select on rounds from anon, authenticated;
grant select (id, host_id, course_id, tee_time, max_players, visibility, notes, status, format,
              approve_requests, created_at) on rounds to authenticated;

alter table rounds alter column invite_code set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);

/** The round's invite code, for the share button. Null for players who can't share it. */
create or replace function round_invite_code(p_round_id uuid)
returns text
language sql stable security definer set search_path = public as $$
  select r.invite_code from rounds r
  where r.id = p_round_id
    and (r.host_id = auth.uid()
         or (not r.approve_requests and exists (
               select 1 from round_players rp
               where rp.round_id = r.id and rp.player_id = auth.uid() and rp.status = 'confirmed')));
$$;
revoke execute on function round_invite_code(uuid) from public, anon;
grant execute on function round_invite_code(uuid) to authenticated;

create or replace function public.join_by_invite(p_invite_code text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $$
declare
  r rounds;
  current_status player_status;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select * into r from rounds where invite_code = p_invite_code and status in ('open', 'full') for update;
  if not found then raise exception 'Invite not found'; end if;

  select status into current_status from round_players where round_id = r.id and player_id = auth.uid();
  if current_status in ('host', 'confirmed', 'waitlisted', 'requested') then return r.id; end if;

  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if exists (select 1 from round_players x where x.round_id = r.id and x.status in ('host', 'confirmed')
               and x.player_id in (select blocked_ids())) then
    raise exception 'Invite not found';
  end if;

  -- Turned down before (by the host, or they said no to an invite): the host decides again
  if current_status = 'declined' then
    update round_players set status = 'requested', created_at = now() where round_id = r.id and player_id = auth.uid();
    insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'request_received', r.id, auth.uid());
    return r.id;
  end if;

  if spots_left(r.id) <= 0 then
    insert into round_players (round_id, player_id, status) values (r.id, auth.uid(), 'waitlisted')
    on conflict (round_id, player_id) do update set status = 'waitlisted', created_at = now();
    return r.id;
  end if;

  insert into round_players (round_id, player_id, status) values (r.id, auth.uid(), 'confirmed')
    on conflict (round_id, player_id) do update set status = 'confirmed';
  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_joined', r.id, auth.uid());
  perform refresh_round_status(r.id);
  return r.id;
end $$;


-- 2. Free to play: no exact locations -----------------------------------------------------------

/** About 1 km grid (0.01 degrees), so a stored spot never pinpoints a home. */
create or replace function coarse_point(p_lat double precision, p_lng double precision)
returns extensions.geography
language sql immutable set search_path = public, extensions as $$
  select st_point(round(p_lng::numeric, 2)::double precision, round(p_lat::numeric, 2)::double precision)::geography;
$$;
revoke execute on function coarse_point(double precision, double precision) from public, anon;

create or replace function public.post_availability(p_day date, p_part text, p_lat double precision, p_lng double precision, p_place_name text default null::text, p_radius_km integer default 25, p_note text default null::text)
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public', 'extensions'
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone 'Europe/Berlin')::date;
  aid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from profiles where id = me and onboarded) then raise exception 'Finish your profile first'; end if;
  if p_day < today or p_day > today + 30 then raise exception 'Pick a day in the next 30 days'; end if;
  if (select count(*) from availability where user_id = me and day >= today and day <> p_day) >= 10 then
    raise exception 'You can have up to 10 days posted';
  end if;

  insert into availability (user_id, day, part_of_day, centre, place_name, radius_km, note)
  values (me, p_day, coalesce(p_part, 'any'), coarse_point(p_lat, p_lng),
          left(nullif(trim(p_place_name), ''), 120), p_radius_km, left(nullif(trim(p_note), ''), 200))
  on conflict (user_id, day) do update
    set part_of_day = excluded.part_of_day, centre = excluded.centre, place_name = excluded.place_name,
        radius_km = excluded.radius_km, note = excluded.note, created_at = now()
  returning id into aid;
  return aid;
end $$;

-- Spots posted before this change
update availability set centre = coarse_point(st_y(centre::geometry), st_x(centre::geometry));

-- Distances in whole km (it was 0.1 km)
create or replace function public.find_available(p_lat double precision default null::double precision, p_lng double precision default null::double precision, p_radius_km double precision default 25, p_course_id uuid default null::uuid, p_from date default null::date, p_to date default null::date)
 returns table(id uuid, user_id uuid, display_name text, avatar_url text, handicap_index numeric, day date, part_of_day text, place_name text, radius_km smallint, note text, distance_km double precision)
 language sql
 stable security definer
 set search_path to 'public', 'extensions'
as $$
  select a.id, p.id, p.display_name, p.avatar_url, p.handicap_index,
         a.day, a.part_of_day, a.place_name, a.radius_km, a.note,
         case when c.id is null and p_lat is null then null
              else round(st_distance(a.centre, coalesce(c.location, st_point(p_lng, p_lat)::geography)) / 1000)::double precision end
  from availability a
  join profiles p on p.id = a.user_id
  left join courses c on c.id = p_course_id
  where auth.uid() is not null
    and a.user_id <> auth.uid()
    and a.user_id not in (select blocked_ids())
    and a.day >= (now() at time zone 'Europe/Berlin')::date
    and (p_from is null or a.day >= p_from)
    and (p_to is null or a.day < p_to)
    and case when p_course_id is not null then c.id is not null and st_dwithin(a.centre, c.location, a.radius_km * 1000)
             when p_lat is not null then st_dwithin(a.centre, st_point(p_lng, p_lat)::geography, p_radius_km * 1000)
             else false end
  order by a.day, 11
  limit 30;
$$;


-- 3. No notification spam -----------------------------------------------------------------------

create or replace function skip_repeat_notification()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.actor_id is not null
     and new.type in ('request_received', 'player_joined', 'player_left', 'friend_request', 'friend_accepted', 'round_invite')
     and exists (select 1 from notifications n
                 where n.user_id = new.user_id and n.actor_id = new.actor_id and n.type = new.type
                   and n.round_id is not distinct from new.round_id
                   and n.created_at > now() - interval '1 hour') then
    return null;  -- they were told less than an hour ago
  end if;
  return new;
end $$;
revoke execute on function skip_repeat_notification() from public, anon, authenticated;

drop trigger if exists notifications_skip_repeats on notifications;
create trigger notifications_skip_repeats before insert on notifications
  for each row execute function skip_repeat_notification();


-- 4. Round posting limits -----------------------------------------------------------------------

create or replace function check_new_round()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return new; end if;  -- the SQL editor and seed scripts
  if new.tee_time <= now() then raise exception 'Pick a tee time in the future'; end if;
  if new.tee_time > now() + interval '1 year' then raise exception 'Pick a tee time within the next year'; end if;
  if (select count(*) from rounds where host_id = new.host_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many rounds today';
  end if;
  return new;
end $$;
revoke execute on function check_new_round() from public, anon, authenticated;

drop trigger if exists rounds_check_new on rounds;
create trigger rounds_check_new before insert on rounds
  for each row execute function check_new_round();


-- 5. Course data pars are fixed -----------------------------------------------------------------

create or replace function public.set_hole_par(p_course_id uuid, p_hole integer, p_par integer)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from scorecards s
    where s.course_id = p_course_id and is_scorecard_member(s.id)
  ) then raise exception 'Start a scorecard on this course first'; end if;
  if exists (select 1 from course_holes where course_id = p_course_id and hole = p_hole and source = 'osm') then
    raise exception 'This par comes from the course data';
  end if;

  insert into course_holes (course_id, hole, par, source, updated_by)
  values (p_course_id, p_hole, p_par, 'player', auth.uid())
  on conflict (course_id, hole) do update
    set par = excluded.par, source = 'player', updated_by = excluded.updated_by, updated_at = now();
end $$;


-- 6. Size limits --------------------------------------------------------------------------------

alter table courses add constraint courses_name_length check (char_length(name) between 1 and 120);
alter table courses add constraint courses_city_length check (char_length(city) <= 120);
alter table courses add constraint courses_country_length check (char_length(country) <= 60);
alter table profiles add constraint profiles_languages_count check (cardinality(languages) <= 20);
alter table profiles add constraint profiles_play_times_count check (cardinality(play_times) <= 10);


-- 7. Housekeeping -------------------------------------------------------------------------------

drop function if exists _probe_default_acl();

-- Supabase's event-trigger helper; it only works inside DDL, but shouldn't be an API endpoint
do $$ begin
  revoke execute on function rls_auto_enable() from public, anon, authenticated;
exception when others then
  raise notice 'rls_auto_enable: %', sqlerrm;
end $$;
