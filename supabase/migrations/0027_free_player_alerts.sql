-- "I'm free" posts now notify people, so they don't depend on someone opening Find:
-- 1. Hosts with an open round that day (player_free): the course is within the distance the player
--    said they'd travel, the tee time fits their time of day, and there's a spot left. The notification
--    has an Invite button for that round. A host hears about a player once per round.
-- 2. Saved searches with "also tell me when players are free" switched on (free_alert): the player's
--    area overlaps the search. At most once a day per player, and 3 free players a day in total.
-- Both skip blocked players (either way) and never stop the post itself.

alter table notifications add column day date;  -- the day a player is free (player_free, free_alert)
alter table search_alerts add column include_free boolean not null default false;

-- Players can switch include_free on their own saved searches, and change nothing else there
create policy search_alerts_update on search_alerts for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke update on search_alerts from authenticated;
grant update (include_free) on search_alerts to authenticated;

-- The list also returns include_free (result columns change, so it is recreated)
drop function my_search_alerts();
create function my_search_alerts()
returns table (id uuid, course_id uuid, course_name text, place_name text, radius_km smallint,
               lat double precision, lng double precision, days text, format text, include_free boolean,
               created_at timestamptz)
language sql stable security invoker set search_path = public, extensions as $$
  select a.id, a.course_id, c.name, a.place_name, a.radius_km,
         st_y(a.centre::geometry), st_x(a.centre::geometry),
         a.days, a.format, a.include_free, a.created_at
  from search_alerts a left join courses c on c.id = a.course_id
  where a.user_id = auth.uid()
  order by a.created_at desc;
$$;
revoke execute on function my_search_alerts() from public, anon;
grant execute on function my_search_alerts() to authenticated;

-- Morning before 12:00, afternoon until 17:00, evening after; in German time, where the courses are
create function part_of_day_at(p_time timestamptz) returns text
language sql immutable set search_path = public as $$
  select case when extract(hour from p_time at time zone 'Europe/Berlin') < 12 then 'morning'
              when extract(hour from p_time at time zone 'Europe/Berlin') < 17 then 'afternoon'
              else 'evening' end;
$$;
revoke execute on function part_of_day_at(timestamptz) from public, anon;

create function notify_free_player() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.day < (now() at time zone 'Europe/Berlin')::date then return new; end if;

  -- 1. Hosts with room in a round that day. One notification per host (their earliest such round).
  insert into notifications (user_id, type, round_id, actor_id, day)
  select distinct on (r.host_id) r.host_id, 'player_free', r.id, new.user_id, new.day
  from rounds r
  join courses c on c.id = r.course_id
  where r.host_id <> new.user_id
    and r.status = 'open'
    and r.tee_time > now()
    and (r.tee_time at time zone 'Europe/Berlin')::date = new.day
    and (new.part_of_day = 'any' or new.part_of_day = part_of_day_at(r.tee_time))
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

  -- 2. Saved searches that asked for free players: a course search when the course is within the
  --    player's travel distance, an area search when the player's area is inside it.
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
    -- already told about this player today (including as a host just above)
    and not exists (select 1 from notifications n
                    where n.user_id = s.user_id and n.actor_id = new.user_id
                      and n.type in ('free_alert', 'player_free')
                      and n.created_at > now() - interval '1 day')
    and (select count(*) from notifications n
         where n.user_id = s.user_id and n.type = 'free_alert'
           and n.created_at > now() - interval '1 day') < 3;

  return new;
exception when others then
  return new;  -- an alert problem must never stop a player posting that they're free
end $$;
revoke execute on function notify_free_player() from public, anon, authenticated;

-- A new day, or the area / time of day changed on an existing one (repeats are filtered above)
create trigger availability_notify after insert or update of centre, radius_km, part_of_day on availability
  for each row execute function notify_free_player();
