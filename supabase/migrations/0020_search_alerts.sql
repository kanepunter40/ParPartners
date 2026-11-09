-- Saved-search alerts: "tell me when a round is posted near X / at course Y".
-- Saved from Find. When a matching nearby round is posted, the player gets a notification (and a push).

create table search_alerts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  -- either a course ...
  course_id   uuid references courses(id) on delete cascade,
  -- ... or an area: a centre and a radius
  centre      extensions.geography(Point, 4326),
  place_name  text check (char_length(place_name) <= 120),
  radius_km   smallint check (radius_km between 1 and 200),
  days        text not null default 'any' check (days in ('any', 'weekend', 'weekday')),
  format      text check (format in ('casual', 'strokeplay', 'stableford', 'match_play', 'best_ball', 'scramble')),
  created_at  timestamptz not null default now(),
  check ((course_id is null) <> (centre is null)),
  check (centre is null or radius_km is not null)
);
create index search_alerts_user_idx on search_alerts (user_id);
create index search_alerts_course_idx on search_alerts (course_id) where course_id is not null;
create index search_alerts_centre_idx on search_alerts using gist (centre) where centre is not null;

alter table search_alerts enable row level security;
-- Mine only. Creating goes through create_search_alert (geography is awkward over REST).
create policy search_alerts_read on search_alerts for select to authenticated using (user_id = (select auth.uid()));
create policy search_alerts_delete on search_alerts for delete to authenticated using (user_id = (select auth.uid()));
revoke all on search_alerts from anon;

-- Saves an alert (or returns the same one if it already exists). p_course_id set = course alert,
-- otherwise p_lat/p_lng/p_radius_km describe the area. Up to 10 per player.
create function create_search_alert(
  p_course_id uuid default null, p_lat double precision default null, p_lng double precision default null,
  p_radius_km int default 25, p_place_name text default null, p_days text default 'any', p_format text default null)
returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  me uuid := auth.uid();
  aid uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_course_id is null and (p_lat is null or p_lng is null) then raise exception 'Pick a course or a place'; end if;

  select id into aid from search_alerts a
   where a.user_id = me
     and a.days = coalesce(p_days, 'any')
     and a.format is not distinct from p_format
     and (case when p_course_id is not null then a.course_id = p_course_id
               else a.centre is not null and a.radius_km = p_radius_km
                    and st_dwithin(a.centre, st_point(p_lng, p_lat)::geography, 500) end);
  if aid is not null then return aid; end if;

  if (select count(*) from search_alerts where user_id = me) >= 10 then raise exception 'You can keep up to 10 alerts'; end if;

  insert into search_alerts (user_id, course_id, centre, place_name, radius_km, days, format)
  values (me, p_course_id,
          case when p_course_id is null then st_point(p_lng, p_lat)::geography end,
          case when p_course_id is null then left(nullif(trim(p_place_name), ''), 120) end,
          case when p_course_id is null then p_radius_km end,
          coalesce(p_days, 'any'), p_format)
  returning id into aid;
  return aid;
end $$;

create function my_search_alerts()
returns table (id uuid, course_id uuid, course_name text, place_name text, radius_km smallint,
               days text, format text, created_at timestamptz)
language sql stable security invoker set search_path = public as $$
  select a.id, a.course_id, c.name, a.place_name, a.radius_km, a.days, a.format, a.created_at
  from search_alerts a left join courses c on c.id = a.course_id
  where a.user_id = auth.uid()
  order by a.created_at desc;
$$;

-- A new nearby round notifies everyone with a matching alert (not the host, nobody blocked either way).
-- Weekend/weekday is judged in German time, where the courses are.
create function notify_search_alerts() returns trigger
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
    and not exists (select 1 from blocks b
                     where (b.blocker_id = a.user_id and b.blocked_id = new.host_id)
                        or (b.blocker_id = new.host_id and b.blocked_id = a.user_id));
  return new;
exception when others then
  return new;  -- an alert problem must never stop a round being posted
end $$;

create trigger rounds_notify_search_alerts after insert on rounds
  for each row execute function notify_search_alerts();

revoke execute on function create_search_alert(uuid, double precision, double precision, int, text, text, text),
  my_search_alerts(), notify_search_alerts() from public, anon;
grant execute on function create_search_alert(uuid, double precision, double precision, int, text, text, text),
  my_search_alerts() to authenticated;
revoke execute on function notify_search_alerts() from authenticated;
