-- Walking or cart, as a choice instead of something people type into the note.
-- rounds.cart: how the host plans to play. availability.cart: how a free player would like to.
-- 'walk' or 'cart'; null means either is fine.
-- A host isn't told about a free player who wants the other way of playing (notify_free_player).

alter table rounds add column cart text check (cart in ('walk', 'cart'));
alter table availability add column cart text check (cart in ('walk', 'cart'));

-- rounds has column-level SELECT (invite_code stays hidden), so the new column needs its own grant
grant select (cart) on rounds to authenticated;

-- post_availability takes the preference (new argument, so the old signature is replaced)
drop function post_availability(date, text, double precision, double precision, text, int, text);
create function post_availability(p_day date, p_part text, p_lat double precision, p_lng double precision,
                                  p_place_name text default null, p_radius_km int default 25,
                                  p_note text default null, p_cart text default null)
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

  insert into availability (user_id, day, part_of_day, centre, place_name, radius_km, note, cart)
  values (me, p_day, coalesce(p_part, 'any'), coarse_point(p_lat, p_lng),
          left(nullif(trim(p_place_name), ''), 120), p_radius_km, left(nullif(trim(p_note), ''), 200), p_cart)
  on conflict (user_id, day) do update
    set part_of_day = excluded.part_of_day, centre = excluded.centre, place_name = excluded.place_name,
        radius_km = excluded.radius_km, note = excluded.note, cart = excluded.cart, created_at = now()
  returning id into aid;
  return aid;
end $$;
revoke execute on function post_availability(date, text, double precision, double precision, text, int, text, text) from public, anon;
grant execute on function post_availability(date, text, double precision, double precision, text, int, text, text) to authenticated;

-- find_available and find_rounds also return it (result columns change, so they are recreated)
drop function find_available(double precision, double precision, double precision, uuid, date, date);
create function find_available(p_lat double precision default null, p_lng double precision default null,
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
    and a.day >= (now() at time zone 'Europe/Berlin')::date
    and (p_from is null or a.day >= p_from)
    and (p_to is null or a.day < p_to)
    and case when p_course_id is not null then c.id is not null and st_dwithin(a.centre, c.location, a.radius_km * 1000)
             when p_lat is not null then st_dwithin(a.centre, st_point(p_lng, p_lat)::geography, p_radius_km * 1000)
             else false end
  order by a.day, 11
  limit 30;
$$;
revoke execute on function find_available(double precision, double precision, double precision, uuid, date, date) from public, anon;
grant execute on function find_available(double precision, double precision, double precision, uuid, date, date) to authenticated;

drop function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text);
create function find_rounds(p_lat double precision default null, p_lng double precision default null,
                            p_radius_km double precision default 25, p_course_id uuid default null,
                            p_from timestamptz default now(), p_to timestamptz default null, p_format text default null)
returns table (round_id uuid, course_id uuid, course_name text, tee_time timestamptz, distance_km double precision,
               spots_left int, max_players smallint, host_id uuid, host_name text, host_handicap numeric,
               approve_requests boolean, format text, cart text)
language sql stable set search_path = public, extensions as $$
  select
    r.id, c.id, c.name, r.tee_time,
    case when p_lat is null then null
         else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end,
    greatest(r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')), 0)::int,
    r.max_players,
    r.host_id, h.display_name, h.handicap_index, r.approve_requests, r.format, r.cart
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

-- Hosts aren't told about a free player who wants the other way of playing (null on either side matches)
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
  where not exists (select 1 from blocks b
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
