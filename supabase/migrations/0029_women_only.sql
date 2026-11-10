-- Women-only rounds and free days. Who counts as a woman comes from the gender players already
-- pick (privately) in onboarding / Edit profile: profile_private.gender = 'Woman'.
--  * Only women can post them. The flag can't be changed after posting.
--  * Everyone else doesn't see them: not in Find, not by link, not in alerts or notifications.
--  * Only women can join, by any route (Find, invite link, a host's invite): checked on round_players.
-- Nobody's gender is revealed by any of this; i_am_woman() only answers for the signed-in player.

alter table rounds add column women_only boolean not null default false;
alter table availability add column women_only boolean not null default false;
grant select (women_only) on rounds to authenticated;

-- For triggers and other definer functions only (not callable from the app)
create function is_woman(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select gender = 'Woman' from profile_private where id = p_user), false);
$$;
revoke execute on function is_woman(uuid) from public, anon, authenticated;

-- The app asks this to decide whether to offer the women-only option
create function i_am_woman() returns boolean
language sql stable security definer set search_path = public as $$
  select is_woman(auth.uid());
$$;
revoke execute on function i_am_woman() from public, anon;
grant execute on function i_am_woman() to authenticated;

-- Seeing rounds: women-only rounds are listed for women; the host and participants always see theirs
drop policy rounds_read on rounds;
create policy rounds_read on rounds for select to authenticated using (
  (visibility = 'nearby' and (not women_only or (select i_am_woman())))
  or host_id = auth.uid()
  or is_round_participant(id)
);

-- Posting: only women, and the flag stays as posted
create function check_women_only_round() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.women_only is distinct from old.women_only then
    raise exception 'Women only can''t be changed after posting';
  end if;
  if tg_op = 'INSERT' and new.women_only and auth.uid() is not null and not is_woman(new.host_id) then
    raise exception 'Only women can post a women-only round';
  end if;
  return new;
end $$;
revoke execute on function check_women_only_round() from public, anon, authenticated;
create trigger rounds_check_women_only before insert or update of women_only on rounds
  for each row execute function check_women_only_round();

-- Joining, by any route: confirmed, waitlisted, requested or invited all need to be a woman
create function check_women_only_player() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status in ('confirmed', 'waitlisted', 'requested', 'invited')
     and exists (select 1 from rounds where id = new.round_id and women_only)
     and not is_woman(new.player_id) then
    raise exception 'This round is for women only';
  end if;
  return new;
end $$;
revoke execute on function check_women_only_player() from public, anon, authenticated;
create trigger round_players_check_women_only before insert or update of status on round_players
  for each row execute function check_women_only_player();

-- find_rounds returns the flag (it runs as the caller, so rounds_read above already filters)
drop function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text);
create function find_rounds(p_lat double precision default null, p_lng double precision default null,
                            p_radius_km double precision default 25, p_course_id uuid default null,
                            p_from timestamptz default now(), p_to timestamptz default null, p_format text default null)
returns table (round_id uuid, course_id uuid, course_name text, tee_time timestamptz, distance_km double precision,
               spots_left int, max_players smallint, host_id uuid, host_name text, host_handicap numeric,
               approve_requests boolean, format text, cart text, women_only boolean)
language sql stable set search_path = public, extensions as $$
  select
    r.id, c.id, c.name, r.tee_time,
    case when p_lat is null then null
         else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end,
    greatest(r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')), 0)::int,
    r.max_players,
    r.host_id, h.display_name, h.handicap_index, r.approve_requests, r.format, r.cart, r.women_only
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

-- Free days: post with the flag (only women), and only women see those posts
drop function post_availability(date, text, double precision, double precision, text, int, text, text);
create function post_availability(p_day date, p_part text, p_lat double precision, p_lng double precision,
                                  p_place_name text default null, p_radius_km int default 25,
                                  p_note text default null, p_cart text default null, p_women_only boolean default false)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
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
revoke execute on function post_availability(date, text, double precision, double precision, text, int, text, text, boolean) from public, anon;
grant execute on function post_availability(date, text, double precision, double precision, text, int, text, text, boolean) to authenticated;

create or replace function find_available(p_lat double precision default null, p_lng double precision default null,
                                          p_radius_km double precision default 25, p_course_id uuid default null,
                                          p_from date default null, p_to date default null)
returns table (id uuid, user_id uuid, display_name text, avatar_url text, handicap_index numeric, day date,
               part_of_day text, place_name text, radius_km smallint, note text, distance_km double precision, cart text)
language sql stable security definer set search_path = public, extensions as $$
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
    and a.day >= (now() at time zone 'Europe/Berlin')::date
    and (p_from is null or a.day >= p_from)
    and (p_to is null or a.day < p_to)
    and case when p_course_id is not null then c.id is not null and st_dwithin(a.centre, c.location, a.radius_km * 1000)
             when p_lat is not null then st_dwithin(a.centre, st_point(p_lng, p_lat)::geography, p_radius_km * 1000)
             else false end
  order by a.day, 11
  limit 30;
$$;

-- New-round alerts: a women-only round only alerts women
create or replace function notify_search_alerts() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
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
         or (a.days = 'weekend') = (extract(isodow from new.tee_time at time zone 'Europe/Berlin') >= 6))
    and (not new.women_only or is_woman(a.user_id))
    and not exists (select 1 from blocks b
                     where (b.blocker_id = a.user_id and b.blocked_id = new.host_id)
                        or (b.blocker_id = new.host_id and b.blocked_id = a.user_id));
  return new;
exception when others then
  return new;  -- an alert problem must never stop a round being posted
end $$;

-- Free-player notifications: a women-only day only reaches women; a women-only round only hears about women
create or replace function notify_free_player() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.day < (now() at time zone 'Europe/Berlin')::date then return new; end if;

  insert into notifications (user_id, type, round_id, actor_id, day)
  select distinct on (r.host_id) r.host_id, 'player_free', r.id, new.user_id, new.day
  from rounds r
  join courses c on c.id = r.course_id
  where r.host_id <> new.user_id
    and r.status = 'open'
    and r.tee_time > now()
    and (r.tee_time at time zone 'Europe/Berlin')::date = new.day
    and (new.part_of_day = 'any' or new.part_of_day = part_of_day_at(r.tee_time))
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
