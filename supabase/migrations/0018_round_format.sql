-- The format a round is played in, chosen by the host and shown in Find and on the round.
-- A label for now: scoring still counts strokes whatever the format.

alter table rounds add column format text not null default 'casual'
  check (format in ('casual', 'strokeplay', 'stableford', 'match_play', 'best_ball', 'scramble'));

-- find_rounds gains a format filter and returns the format, so it has to be recreated (new result columns)
drop function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz);

create function find_rounds(
  p_lat double precision default null, p_lng double precision default null, p_radius_km double precision default 25,
  p_course_id uuid default null, p_from timestamptz default now(), p_to timestamptz default null,
  p_format text default null)
returns table (round_id uuid, course_id uuid, course_name text, tee_time timestamptz, distance_km double precision,
               spots_left int, max_players smallint, host_id uuid, host_name text, host_handicap numeric,
               approve_requests boolean, format text)
language sql stable set search_path = public, extensions as $$
  select
    r.id, c.id, c.name, r.tee_time,
    case when p_lat is null then null
         else round((st_distance(c.location, st_point(p_lng, p_lat)::geography) / 1000)::numeric, 1)::double precision end,
    (r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')))::int,
    r.max_players,
    r.host_id, h.display_name, h.handicap_index, r.approve_requests, r.format
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
    and (p_format is null or r.format = p_format)
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

revoke execute on function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function find_rounds(double precision, double precision, double precision, uuid, timestamptz, timestamptz, text) to authenticated;
