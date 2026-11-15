-- Time zones per course. Until now everything ran on German time: weekend matching for saved
-- searches, "today" for free-to-play days, morning/afternoon/evening, and the tee times in pushes.
-- With courses in England and Australia, each course now carries its own IANA time zone, worked out
-- from its country and location. Tee times are shown and entered in the course's local time.

-- The time zone at a place. With a country (courses) the country decides; without one (a player's
-- free-to-play area) the location alone is used. Covers the countries we import: DE, FR, GB, AU.
-- Anything else falls back to Europe/Berlin. Same offsets and DST rules are all that matter here,
-- so e.g. Victoria and Tasmania share Australia/Sydney's rules and France is listed as Paris for clarity.
create or replace function zone_at(p_country text, p_lat double precision, p_lng double precision)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    -- Australia (mainland and Tasmania)
    when p_country = 'AU' or (p_country is null and p_lat between -44 and -9 and p_lng between 112 and 154) then
      case
        when p_lng < 129 then 'Australia/Perth'                                   -- WA: +8, no DST
        when p_lat >= -26 and p_lng < 138 then 'Australia/Darwin'                 -- NT: +9:30, no DST
        when p_lat < -26 and p_lng < 141 then 'Australia/Adelaide'                -- SA: +9:30, DST
        when p_lng < 141.6 and p_lat between -34 and -29 then 'Australia/Broken_Hill'  -- far-west NSW keeps SA time
        -- QLD: +10, no DST. Its southern border runs along 29°S, rising to about 28.2°S at the coast.
        when p_lat >= -29 + greatest(0, least(1, (p_lng - 148.9) / 4.65)) * 0.83 then 'Australia/Brisbane'
        when p_lat < -39.5 then 'Australia/Hobart'
        else 'Australia/Sydney'                                                   -- NSW, ACT, VIC: +10, DST
      end
    when p_country = 'GB' then 'Europe/London'
    when p_country = 'FR' then 'Europe/Paris'
    when p_country is not null then 'Europe/Berlin'
    -- No country: Great Britain and Ireland by location, keeping the French Channel coast on Paris time
    when p_lng between -11 and 1.45 and p_lat between 50.3 and 61 then 'Europe/London'
    when p_lng between -11 and -1.9 and p_lat between 49.85 and 61 then 'Europe/London'
    else 'Europe/Berlin'
  end;
$$;

alter table courses add column time_zone text not null
  generated always as (zone_at(country, extensions.st_y(location::extensions.geometry), extensions.st_x(location::extensions.geometry))) stored;

-- Morning / afternoon / evening at the course, not in Germany.
drop function if exists part_of_day_at(timestamptz);
create function part_of_day_at(p_time timestamptz, p_zone text)
returns text
language sql
immutable
set search_path = public
as $$
  select case when extract(hour from p_time at time zone p_zone) < 12 then 'morning'
              when extract(hour from p_time at time zone p_zone) < 17 then 'afternoon'
              else 'evening' end;
$$;
revoke execute on function part_of_day_at(timestamptz, text) from public, anon;
grant execute on function part_of_day_at(timestamptz, text) to authenticated;

-- Saved searches: "weekend" means a weekend at the course.
create or replace function notify_search_alerts()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.visibility <> 'nearby' or new.status <> 'open' or new.tee_time <= now() then return new; end if;

  insert into notifications (user_id, type, round_id, actor_id)
  select distinct a.user_id, 'round_alert', new.id, new.host_id
  from search_alerts a
  join courses c on c.id = new.course_id
  where a.user_id <> new.host_id
    and (a.course_id = new.course_id
         or (a.centre is not null and st_dwithin(a.centre, c.location, a.radius_km * 1000)))
    and (a.format is null or a.format = new.format)
    and (a.days = 'any'
         or (a.days = 'weekend') = (extract(isodow from new.tee_time at time zone c.time_zone) >= 6))
    and (not new.women_only or is_woman(a.user_id))
    and not exists (select 1 from blocks b
                     where (b.blocker_id = a.user_id and b.blocked_id = new.host_id)
                        or (b.blocker_id = new.host_id and b.blocked_id = a.user_id));
  return new;
exception when others then
  return new;
end $$;

-- Free to play: "today" where the player is; a round's day and part of day at its course.
create or replace function notify_free_player()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if new.day < (now() at time zone zone_at(null, st_y(new.centre::geometry), st_x(new.centre::geometry)))::date then
    return new;
  end if;

  insert into notifications (user_id, type, round_id, actor_id, day)
  select distinct on (r.host_id) r.host_id, 'player_free', r.id, new.user_id, new.day
  from rounds r
  join courses c on c.id = r.course_id
  where r.host_id <> new.user_id
    and r.status = 'open'
    and r.tee_time > now()
    and (r.tee_time at time zone c.time_zone)::date = new.day
    and (new.part_of_day = 'any' or new.part_of_day = part_of_day_at(r.tee_time, c.time_zone))
    and (new.cart is null or r.cart is null or new.cart = r.cart)
    and (not new.women_only or is_woman(r.host_id))
    and (not r.women_only or is_woman(new.user_id))
    and st_dwithin(new.centre, c.location, new.radius_km * 1000)
    and spots_left(r.id) > 0
    and not exists (select 1 from round_players rp where rp.round_id = r.id and rp.player_id = new.user_id)
    and not exists (select 1 from notifications n
                    where n.user_id = r.host_id and n.type = 'player_free'
                      and n.round_id = r.id and n.actor_id = new.user_id)
    and not exists (select 1 from blocks b
                    where (b.blocker_id = r.host_id and b.blocked_id = new.user_id)
                       or (b.blocker_id = new.user_id and b.blocked_id = r.host_id))
  order by r.host_id, r.tee_time;

  insert into notifications (user_id, type, actor_id, day)
  select s.user_id, 'free_alert', new.user_id, new.day
  from (select distinct a.user_id
        from search_alerts a
        left join courses c on c.id = a.course_id
        where a.include_free
          and a.user_id <> new.user_id
          and (case when a.course_id is not null then st_dwithin(new.centre, c.location, new.radius_km * 1000)
                    else st_dwithin(a.centre, new.centre, a.radius_km * 1000) end)
          and (a.days = 'any' or (a.days = 'weekend') = (extract(isodow from new.day) >= 6))) s
  where (not new.women_only or is_woman(s.user_id))
    and not exists (select 1 from blocks b
                    where (b.blocker_id = s.user_id and b.blocked_id = new.user_id)
                       or (b.blocker_id = new.user_id and b.blocked_id = s.user_id))
    and not exists (select 1 from notifications n
                    where n.user_id = s.user_id and n.actor_id = new.user_id
                      and n.type in ('free_alert', 'player_free')
                      and n.created_at > now() - interval '1 day')
    and (select count(*) from notifications n
         where n.user_id = s.user_id and n.type = 'free_alert'
           and n.created_at > now() - interval '1 day') < 3;

  return new;
exception when others then
  return new;
end $$;

-- Free players: hide days that are over where the player is.
create or replace function find_available(p_lat double precision default null, p_lng double precision default null,
  p_radius_km double precision default 25, p_course_id uuid default null, p_from date default null, p_to date default null)
returns table(id uuid, user_id uuid, display_name text, avatar_url text, handicap_index numeric, day date,
  part_of_day text, place_name text, radius_km smallint, note text, distance_km double precision, cart text)
language sql
stable security definer
set search_path = public, extensions
as $$
  select a.id, p.id, p.display_name, p.avatar_url, p.handicap_index,
         a.day, a.part_of_day, a.place_name, a.radius_km, a.note,
         case when c.id is null and p_lat is null then null
              else round(st_distance(a.centre, coalesce(c.location, st_point(p_lng, p_lat)::geography)) / 1000)::double precision end,
         a.cart
  from availability a
  join profiles p on p.id = a.user_id
  left join courses c on c.id = p_course_id
  where auth.uid() is not null
    and a.user_id <> auth.uid()
    and a.user_id not in (select blocked_ids())
    and (not a.women_only or is_woman(auth.uid()))
    and a.day >= (now() at time zone zone_at(null, st_y(a.centre::geometry), st_x(a.centre::geometry)))::date
    and (p_from is null or a.day >= p_from)
    and (p_to is null or a.day < p_to)
    and case when p_course_id is not null then c.id is not null and st_dwithin(a.centre, c.location, a.radius_km * 1000)
             when p_lat is not null then st_dwithin(a.centre, st_point(p_lng, p_lat)::geography, p_radius_km * 1000)
             else false end
  order by a.day, 11
  limit 30;
$$;

-- Posting a free day: "today" and the 30-day window where the player is.
create or replace function post_availability(p_day date, p_part text, p_lat double precision, p_lng double precision,
  p_place_name text default null, p_radius_km integer default 25, p_note text default null, p_cart text default null,
  p_women_only boolean default false)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  me uuid := auth.uid();
  today date := (now() at time zone zone_at(null, p_lat, p_lng))::date;
  aid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if not exists (select 1 from profiles where id = me and onboarded) then raise exception 'Finish your profile first'; end if;
  if p_day < today or p_day > today + 30 then raise exception 'Pick a day in the next 30 days'; end if;
  if (select count(*) from availability where user_id = me and day >= today and day <> p_day) >= 10 then
    raise exception 'You can have up to 10 days posted';
  end if;
  if coalesce(p_women_only, false) and not is_woman(me) then
    raise exception 'Only women can post a women-only day';
  end if;

  insert into availability (user_id, day, part_of_day, centre, place_name, radius_km, note, cart, women_only)
  values (me, p_day, coalesce(p_part, 'any'), coarse_point(p_lat, p_lng),
          left(nullif(trim(p_place_name), ''), 120), p_radius_km, left(nullif(trim(p_note), ''), 200), p_cart,
          coalesce(p_women_only, false))
  on conflict (user_id, day) do update
    set part_of_day = excluded.part_of_day, centre = excluded.centre, place_name = excluded.place_name,
        radius_km = excluded.radius_km, note = excluded.note, cart = excluded.cart,
        women_only = excluded.women_only, created_at = now()
  returning id into aid;
  return aid;
end $$;

revoke execute on function zone_at(text, double precision, double precision) from public, anon;
grant execute on function zone_at(text, double precision, double precision) to authenticated;

-- Find: each round comes with its course's time zone, so the app shows the course's local tee time.
drop function if exists find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text);
create function find_rounds(p_lat double precision default null, p_lng double precision default null,
  p_radius_km double precision default 25, p_course_id uuid default null, p_from timestamptz default now(),
  p_to timestamptz default null, p_format text default null)
returns table(round_id uuid, course_id uuid, course_name text, tee_time timestamptz, distance_km double precision,
  spots_left integer, max_players smallint, host_id uuid, host_name text, host_handicap numeric,
  approve_requests boolean, format text, cart text, women_only boolean, time_zone text)
language sql
stable
set search_path = public, extensions
as $$
  select
    r.id, c.id, c.name, r.tee_time,
    case when p_lat is null then null
         else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end,
    greatest(r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')), 0)::int,
    r.max_players,
    r.host_id, h.display_name, h.handicap_index, r.approve_requests, r.format, r.cart, r.women_only, c.time_zone
  from rounds r
  join courses  c on c.id = r.course_id
  join profiles h on h.id = r.host_id
  left join round_players rp on rp.round_id = r.id
  where r.status in ('open', 'full')
    and r.visibility = 'nearby'
    and r.host_id <> auth.uid()
    and r.tee_time >= greatest(coalesce(p_from, now()), now())
    and (p_to is null or r.tee_time < p_to)
    and (p_course_id is null or r.course_id = p_course_id)
    and (p_format is null or r.format = p_format)
    and (p_lat is null or st_dwithin(c.location, st_point(p_lng, p_lat)::geography, p_radius_km * 1000))
    and not exists (
      select 1 from round_players me
      where me.round_id = r.id and me.player_id = auth.uid() and me.status in ('confirmed', 'requested', 'waitlisted')
    )
    and not exists (
      select 1 from round_players x
      where x.round_id = r.id and x.status in ('host', 'confirmed') and x.player_id in (select blocked_ids())
    )
  group by r.id, c.id, h.id
  order by r.tee_time
  limit 50;
$$;
revoke execute on function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text) to authenticated;

-- Home feed: the same for rounds friends posted or joined.
drop function if exists home_feed(timestamptz, integer);
create function home_feed(p_before timestamptz default null, p_limit integer default 30)
returns table(kind text, at timestamptz, actor_id uuid, actor_name text, other_id uuid, other_name text, round_id uuid,
  scorecard_id uuid, course_name text, tee_time timestamptz, spots_left integer, holes scorecard_holes, strokes integer,
  to_par integer, personal_best boolean, time_zone text)
language sql
stable security definer
set search_path = public
as $$
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
    select r.id, r.host_id, r.created_at, r.tee_time, c.name as course, c.time_zone,
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
           (k.holes = '18' and k.prev_best is not null and k.strokes < k.prev_best) as personal_best,
           null::text as time_zone
    from ranked k
    union all
    select 'round_posted', o.created_at, o.host_id, p.display_name, null, null,
           o.id, null, o.course, o.tee_time, o.spots_left, null, null, null, false, o.time_zone
    from open_rounds o join profiles p on p.id = o.host_id
    where o.host_id in (select id from friends)
    union all
    select 'round_joined', rp.created_at, rp.player_id, p.display_name, null, null,
           o.id, null, o.course, o.tee_time, o.spots_left, null, null, null, false, o.time_zone
    from round_players rp
    join open_rounds o on o.id = rp.round_id
    join profiles p on p.id = rp.player_id
    where rp.status = 'confirmed' and rp.player_id in (select id from friends)
    union all
    select 'new_friend', f.accepted_at,
           a.id, a.display_name, b.id, b.display_name,
           null, null, null, null, null, null, null, null, false, null
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
revoke execute on function home_feed(timestamptz, integer) from public, anon;
grant execute on function home_feed(timestamptz, integer) to authenticated;
