-- "I'm free" posts: a player says which day they could play and roughly where, without picking a
-- course or tee time. They show in Find, and hosts can invite them to one of their rounds.
-- One post per player per day, up to 30 days ahead; past days simply stop showing.

create table availability (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references profiles(id) on delete cascade,
  day          date not null,
  part_of_day  text not null default 'any' check (part_of_day in ('morning', 'afternoon', 'evening', 'any')),
  centre       extensions.geography(Point, 4326) not null,
  place_name   text check (char_length(place_name) <= 120),
  radius_km    smallint not null default 25 check (radius_km between 1 and 200),
  note         text check (char_length(note) <= 200),
  created_at   timestamptz not null default now(),
  unique (user_id, day)
);
create index availability_day_idx on availability (day);
create index availability_centre_idx on availability using gist (centre);

alter table availability enable row level security;
-- My own posts only; others are seen through find_available. Posting goes through post_availability.
create policy availability_read on availability for select to authenticated using (user_id = (select auth.uid()));
create policy availability_delete on availability for delete to authenticated using (user_id = (select auth.uid()));
revoke all on availability from anon;

-- Posts (or updates) my "I'm free" for a day
create function post_availability(
  p_day date, p_part text, p_lat double precision, p_lng double precision,
  p_place_name text default null, p_radius_km int default 25, p_note text default null)
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

  insert into availability (user_id, day, part_of_day, centre, place_name, radius_km, note)
  values (me, p_day, coalesce(p_part, 'any'), st_point(p_lng, p_lat)::geography,
          left(nullif(trim(p_place_name), ''), 120), p_radius_km, left(nullif(trim(p_note), ''), 200))
  on conflict (user_id, day) do update
    set part_of_day = excluded.part_of_day, centre = excluded.centre, place_name = excluded.place_name,
        radius_km = excluded.radius_km, note = excluded.note, created_at = now()
  returning id into aid;
  return aid;
end $$;

-- Players free to play. Near a point: their area's centre is within my search radius.
-- At a course: the course is within the distance they said they'd travel.
create function find_available(
  p_lat double precision default null, p_lng double precision default null, p_radius_km double precision default 25,
  p_course_id uuid default null, p_from date default null, p_to date default null)
returns table (id uuid, user_id uuid, display_name text, avatar_url text, handicap_index numeric,
               day date, part_of_day text, place_name text, radius_km smallint, note text, distance_km double precision)
language sql stable security definer set search_path = public, extensions as $$
  select a.id, p.id, p.display_name, p.avatar_url, p.handicap_index,
         a.day, a.part_of_day, a.place_name, a.radius_km, a.note,
         case when c.id is null and p_lat is null then null
              else round((st_distance(a.centre, coalesce(c.location, st_point(p_lng, p_lat)::geography)) / 1000)::numeric, 1)::double precision end
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

-- A host invites a free player to their round. The player can then see it (even invite-only) and join.
-- Quietly does nothing for blocked players or someone who already said no to this round.
create function invite_to_round(p_round_id uuid, p_player_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r rounds;
  current_status player_status;
begin
  if me is null then raise exception 'Not signed in'; end if;
  select * into r from rounds where id = p_round_id for update;
  if not found or r.host_id <> me then raise exception 'Only the host can invite players'; end if;
  if p_player_id = me then raise exception 'You can''t invite yourself'; end if;
  if r.status <> 'open' or r.tee_time <= now() then raise exception 'Round not available'; end if;
  if spots_left(p_round_id) <= 0 then raise exception 'Round is full'; end if;
  if not exists (select 1 from profiles where id = p_player_id) then raise exception 'Player not found'; end if;
  if p_player_id in (select blocked_ids()) then return; end if;
  if (select count(*) from notifications where actor_id = me and type = 'round_invite'
        and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Too many invites today';
  end if;

  select status into current_status from round_players where round_id = p_round_id and player_id = p_player_id;
  if current_status in ('host', 'confirmed', 'waitlisted', 'invited', 'declined') then return; end if;

  insert into round_players (round_id, player_id, status) values (p_round_id, p_player_id, 'invited')
  on conflict (round_id, player_id) do update set status = 'invited', created_at = now();
  insert into notifications (user_id, type, round_id, actor_id) values (p_player_id, 'round_invite', p_round_id, me);
end $$;

revoke execute on function post_availability(date, text, double precision, double precision, text, int, text),
  find_available(double precision, double precision, double precision, uuid, date, date),
  invite_to_round(uuid, uuid) from public, anon;
grant execute on function post_availability(date, text, double precision, double precision, text, int, text),
  find_available(double precision, double precision, double precision, uuid, date, date),
  invite_to_round(uuid, uuid) to authenticated;
