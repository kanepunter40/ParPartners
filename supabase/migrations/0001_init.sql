-- Par Partners: initial schema
-- Run in the Supabase SQL editor, or with `supabase db push`. Choose an EU region (Frankfurt) for the project.

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type round_visibility as enum ('nearby', 'invite_only');
create type round_status     as enum ('open', 'full', 'cancelled', 'played');
create type player_status    as enum ('host', 'confirmed', 'requested', 'declined', 'withdrawn');
create type play_vibe        as enum ('relaxed', 'competitive', 'very_competitive');
create type round_length     as enum ('nine', 'eighteen', 'either');

-- ---------------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------------
create table courses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  city        text,
  country     text not null default 'DE',
  location    extensions.geography(Point, 4326) not null,
  osm_id      bigint unique,            -- for the one-off OpenStreetMap import
  added_by    uuid references auth.users(id) on delete set null,
  verified    boolean not null default false,
  created_at  timestamptz not null default now()
);
create index courses_location_idx on courses using gist (location);
create index courses_name_idx     on courses (lower(name));

-- ---------------------------------------------------------------------------
-- Profiles: public fields vs private fields are split into two tables, because
-- Row Level Security works on rows, not columns.
-- ---------------------------------------------------------------------------
create table profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  display_name    text not null check (char_length(display_name) between 1 and 60),
  avatar_url      text,
  home_course_id  uuid references courses(id) on delete set null,
  handicap_index  numeric(3,1) check (handicap_index between -10 and 54),
  no_handicap     boolean not null default false,
  languages       text[] not null default '{}',
  play_times      text[] not null default '{}',   -- weekday_morning, weekday_evening, weekend, anytime
  round_length    round_length not null default 'either',
  vibe            play_vibe not null default 'relaxed',
  onboarded       boolean not null default false,
  created_at      timestamptz not null default now()
);

create table profile_private (
  id                 uuid primary key references profiles(id) on delete cascade,
  birth_year         smallint check (birth_year between 1900 and 2100),
  gender             text,
  show_age_gender    boolean not null default false,
  push_enabled       boolean not null default false
);

-- What other players are allowed to see. Runs with the view owner's rights on
-- purpose (security_invoker off) so it can read profile_private, but only
-- exposes age and gender when the player has switched "show on my profile" on.
create view player_cards as
select
  p.id,
  p.display_name,
  p.avatar_url,
  p.home_course_id,
  p.handicap_index,
  p.languages,
  p.vibe,
  case when pp.show_age_gender then extract(year from now())::int - pp.birth_year end as age,
  case when pp.show_age_gender then pp.gender end as gender
from profiles p
left join profile_private pp on pp.id = p.id;

-- ---------------------------------------------------------------------------
-- Rounds
-- ---------------------------------------------------------------------------
create table rounds (
  id                 uuid primary key default gen_random_uuid(),
  host_id            uuid not null references profiles(id) on delete cascade,
  course_id          uuid not null references courses(id),
  tee_time           timestamptz not null,
  max_players        smallint not null default 4 check (max_players between 2 and 8),
  visibility         round_visibility not null default 'nearby',
  approve_requests   boolean not null default true,
  notes              text check (char_length(notes) <= 500),
  invite_code        text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  status             round_status not null default 'open',
  created_at         timestamptz not null default now()
);
create index rounds_course_time_idx on rounds (course_id, tee_time);
create index rounds_open_idx        on rounds (tee_time) where status = 'open';

create table round_players (
  round_id    uuid not null references rounds(id) on delete cascade,
  player_id   uuid not null references profiles(id) on delete cascade,
  status      player_status not null,
  created_at  timestamptz not null default now(),
  primary key (round_id, player_id)
);
create index round_players_player_idx on round_players (player_id);

-- Host is always a player in their own round.
create function add_host_as_player() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into round_players (round_id, player_id, status) values (new.id, new.host_id, 'host');
  return new;
end $$;
create trigger rounds_add_host after insert on rounds
  for each row execute function add_host_as_player();

-- ---------------------------------------------------------------------------
-- Notifications and push tokens
-- ---------------------------------------------------------------------------
create table notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  type        text not null,        -- request_received, request_accepted, request_declined, spot_opened, player_left
  round_id    uuid references rounds(id) on delete cascade,
  actor_id    uuid references profiles(id) on delete set null,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);

create table device_tokens (
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null,
  platform    text not null check (platform in ('ios', 'android', 'web')),
  created_at  timestamptz not null default now(),
  primary key (user_id, token)
);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies don't recurse)
-- ---------------------------------------------------------------------------
create function is_round_host(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from rounds where id = rid and host_id = auth.uid());
$$;

create function is_round_participant(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from round_players
    where round_id = rid and player_id = auth.uid() and status in ('host', 'confirmed', 'requested')
  );
$$;

create function spots_left(rid uuid) returns int
language sql stable security definer set search_path = public as $$
  select r.max_players - count(*) filter (where rp.status in ('host', 'confirmed'))::int
  from rounds r left join round_players rp on rp.round_id = r.id
  where r.id = rid group by r.max_players;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table courses          enable row level security;
alter table profiles         enable row level security;
alter table profile_private  enable row level security;
alter table rounds           enable row level security;
alter table round_players    enable row level security;
alter table notifications    enable row level security;
alter table device_tokens    enable row level security;

-- courses: everyone signed in can read; anyone can suggest a missing course
create policy courses_read   on courses for select to authenticated using (true);
create policy courses_insert on courses for insert to authenticated
  with check (added_by = auth.uid() and verified = false);

-- profiles: signed-in players can read basic profiles; you edit only your own
create policy profiles_read   on profiles for select to authenticated using (true);
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid());

-- private fields: owner only
create policy private_all on profile_private for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- rounds: nearby rounds are discoverable; invite-only rounds only for host and participants
create policy rounds_read on rounds for select to authenticated
  using (
    visibility = 'nearby'
    or host_id = auth.uid()
    or is_round_participant(id)
  );
create policy rounds_insert on rounds for insert to authenticated with check (host_id = auth.uid());
create policy rounds_update on rounds for update to authenticated using (host_id = auth.uid());
create policy rounds_delete on rounds for delete to authenticated using (host_id = auth.uid());

-- round_players: see your own rows, the host sees all rows for their round,
-- everyone sees confirmed players of rounds they can see. Writes go through functions below.
create policy round_players_read on round_players for select to authenticated
  using (
    player_id = auth.uid()
    or is_round_host(round_id)
    or (status in ('host', 'confirmed') and exists (select 1 from rounds r where r.id = round_id))
  );

-- notifications and tokens: owner only
create policy notifications_read   on notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_update on notifications for update to authenticated using (user_id = auth.uid());
create policy tokens_all on device_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Search: by course or by radius around a point
-- ---------------------------------------------------------------------------
create function find_rounds(
  p_lat        double precision default null,
  p_lng        double precision default null,
  p_radius_km  double precision default 25,
  p_course_id  uuid default null,
  p_from       timestamptz default now(),
  p_to         timestamptz default null
)
returns table (
  round_id      uuid,
  course_id     uuid,
  course_name   text,
  tee_time      timestamptz,
  distance_km   double precision,
  spots_left    int,
  max_players  smallint,
  host_id       uuid,
  host_name     text,
  host_handicap numeric,
  approve_requests boolean
)
language sql stable security invoker set search_path = public, extensions as $$
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
  group by r.id, c.id, h.id
  having r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')) > 0
  order by r.tee_time
  limit 50;
$$;

-- ---------------------------------------------------------------------------
-- Joining a round
-- ---------------------------------------------------------------------------
create function request_to_join(p_round_id uuid) returns player_status
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  new_status player_status;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found or r.status <> 'open' then raise exception 'Round not available'; end if;
  if r.visibility = 'invite_only' then raise exception 'Round is invite only'; end if;
  if spots_left(p_round_id) <= 0 then raise exception 'Round is full'; end if;

  new_status := case when r.approve_requests then 'requested' else 'confirmed' end;

  insert into round_players (round_id, player_id, status)
  values (p_round_id, auth.uid(), new_status)
  on conflict (round_id, player_id) do update set status = excluded.status
    where round_players.status in ('declined', 'withdrawn');

  insert into notifications (user_id, type, round_id, actor_id)
  values (r.host_id, case when new_status = 'requested' then 'request_received' else 'player_joined' end, p_round_id, auth.uid());

  perform refresh_round_status(p_round_id);
  return new_status;
end $$;

create function respond_to_request(p_round_id uuid, p_player_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_round_host(p_round_id) then raise exception 'Only the host can respond'; end if;
  if p_accept and spots_left(p_round_id) <= 0 then raise exception 'Round is full'; end if;

  update round_players
     set status = case when p_accept then 'confirmed' else 'declined' end::player_status
   where round_id = p_round_id and player_id = p_player_id and status = 'requested';

  insert into notifications (user_id, type, round_id, actor_id)
  values (p_player_id, case when p_accept then 'request_accepted' else 'request_declined' end, p_round_id, auth.uid());

  perform refresh_round_status(p_round_id);
end $$;

create function leave_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = p_round_id;
  if r.host_id = auth.uid() then raise exception 'Hosts cancel the round instead'; end if;

  update round_players set status = 'withdrawn'
   where round_id = p_round_id and player_id = auth.uid() and status in ('confirmed', 'requested');

  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_left', p_round_id, auth.uid());
  perform refresh_round_status(p_round_id);
end $$;

create function join_by_invite(p_invite_code text) returns uuid
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where invite_code = p_invite_code and status in ('open', 'full');
  if not found then raise exception 'Invite not found'; end if;
  if spots_left(r.id) <= 0 then raise exception 'Round is full'; end if;
  insert into round_players (round_id, player_id, status) values (r.id, auth.uid(), 'confirmed')
    on conflict (round_id, player_id) do update set status = 'confirmed';
  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_joined', r.id, auth.uid());
  perform refresh_round_status(r.id);
  return r.id;
end $$;

-- Flips a round between open and full as players come and go
create function refresh_round_status(p_round_id uuid) returns void
language sql security definer set search_path = public as $$
  update rounds set status = case when spots_left(id) <= 0 then 'full' else 'open' end::round_status
   where id = p_round_id and status in ('open', 'full');
$$;

revoke all on function request_to_join, respond_to_request, leave_round, join_by_invite, refresh_round_status from public;
grant execute on function request_to_join, respond_to_request, leave_round, join_by_invite to authenticated;
grant select on player_cards to authenticated;

-- ---------------------------------------------------------------------------
-- Course lookup with coordinates (geography columns are not friendly over REST)
-- ---------------------------------------------------------------------------
create function search_courses(
  p_query text default null,
  p_lat   double precision default null,
  p_lng   double precision default null,
  p_limit int default 10
)
returns table (id uuid, name text, city text, lat double precision, lng double precision, distance_km double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id, c.name, c.city,
         st_y(c.location::geometry), st_x(c.location::geometry),
         case when p_lat is null then null
              else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end
  from courses c
  where p_query is null or c.name ilike '%' || p_query || '%' or c.city ilike '%' || p_query || '%'
  order by case when p_lat is null then 0 else st_distance(c.location, st_point(p_lng, p_lat)::geography) end, c.name
  limit least(p_limit, 25);
$$;

create function get_course(p_id uuid)
returns table (id uuid, name text, city text, lat double precision, lng double precision)
language sql stable security invoker set search_path = public, extensions as $$
  select c.id, c.name, c.city, st_y(c.location::geometry), st_x(c.location::geometry)
  from courses c where c.id = p_id;
$$;
