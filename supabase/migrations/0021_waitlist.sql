-- Waitlist. Joining a full round (from Find, the round page or an invite link) puts you on its
-- waitlist. When a spot opens, the player who has waited longest is moved in and told, and the host
-- hears that they joined. Full rounds now show in Find so people can get on the list.

-- Waitlisted and invited players can see the round, including invite-only ones
create or replace function is_round_participant(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from round_players
    where round_id = rid and player_id = auth.uid()
      and status in ('host', 'confirmed', 'requested', 'waitlisted', 'invited')
  );
$$;

-- Called whenever the line-up changes: fills free spots from the waitlist (until tee time),
-- then flips the round between open and full.
create or replace function refresh_round_status(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  next_player uuid;
begin
  select * into r from rounds where id = p_round_id;
  if not found or r.status not in ('open', 'full') then return; end if;

  if r.tee_time > now() then
    loop
      exit when spots_left(p_round_id) <= 0;
      select player_id into next_player from round_players
       where round_id = p_round_id and status = 'waitlisted'
       order by created_at limit 1;
      exit when next_player is null;
      update round_players set status = 'confirmed' where round_id = p_round_id and player_id = next_player;
      insert into notifications (user_id, type, round_id, actor_id) values (next_player, 'waitlist_promoted', p_round_id, r.host_id);
      insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_joined', p_round_id, next_player);
    end loop;
  end if;

  update rounds set status = case when spots_left(id) <= 0 then 'full' else 'open' end::round_status
   where id = p_round_id and status in ('open', 'full');
end $$;
revoke execute on function refresh_round_status(uuid) from public, anon, authenticated;

create or replace function request_to_join(p_round_id uuid) returns player_status
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  current_status player_status;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found then raise exception 'Round not available'; end if;

  -- Already in or waiting (e.g. a double tap): nothing to do
  select status into current_status from round_players where round_id = p_round_id and player_id = auth.uid();
  if current_status in ('host', 'confirmed', 'waitlisted') then return current_status; end if;

  if r.status not in ('open', 'full') then raise exception 'Round not available'; end if;
  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if r.visibility = 'invite_only' and current_status is distinct from 'invited' then raise exception 'Round is invite only'; end if;
  if exists (select 1 from round_players x where x.round_id = p_round_id and x.status in ('host', 'confirmed')
               and x.player_id in (select blocked_ids())) then
    raise exception 'Round not available';
  end if;

  if spots_left(p_round_id) <= 0 then
    insert into round_players (round_id, player_id, status) values (p_round_id, auth.uid(), 'waitlisted')
    on conflict (round_id, player_id) do update set status = 'waitlisted', created_at = now();
    return 'waitlisted';
  end if;

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
  select * into r from rounds where invite_code = p_invite_code and status in ('open', 'full') for update;
  if not found then raise exception 'Invite not found'; end if;

  select status into current_status from round_players where round_id = r.id and player_id = auth.uid();
  if current_status in ('host', 'confirmed', 'waitlisted') then return r.id; end if;

  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if exists (select 1 from round_players x where x.round_id = r.id and x.status in ('host', 'confirmed')
               and x.player_id in (select blocked_ids())) then
    raise exception 'Invite not found';
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

-- Leaving the line-up, stepping off the waitlist, or saying no to an invite.
-- Only leaving the line-up tells the host (and opens the spot to the waitlist).
create or replace function leave_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  prev_status player_status;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found then raise exception 'Round not available'; end if;
  if r.host_id = auth.uid() then raise exception 'Hosts delete the round instead'; end if;
  if r.status = 'cancelled' then return; end if;

  select status into prev_status from round_players where round_id = p_round_id and player_id = auth.uid();
  if prev_status is null or prev_status not in ('confirmed', 'requested', 'waitlisted', 'invited') then return; end if;
  if prev_status = 'confirmed' and r.tee_time <= now() then raise exception 'The round has already started'; end if;

  update round_players set status = case when prev_status = 'invited' then 'declined' else 'withdrawn' end::player_status
   where round_id = p_round_id and player_id = auth.uid();

  if prev_status = 'confirmed' then
    insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_left', p_round_id, auth.uid());
    perform refresh_round_status(p_round_id);
  end if;
end $$;

-- My place on the waitlist (1 = next in), or null if I'm not on it
create function waitlist_position(p_round_id uuid) returns int
language sql stable security definer set search_path = public as $$
  select (select count(*)::int + 1 from round_players w
           where w.round_id = p_round_id and w.status = 'waitlisted' and w.created_at < me.created_at)
  from round_players me
  where me.round_id = p_round_id and me.player_id = auth.uid() and me.status = 'waitlisted';
$$;
revoke execute on function waitlist_position(uuid) from public, anon;
grant execute on function waitlist_position(uuid) to authenticated;

-- Cancelling also tells the waitlist
create or replace function delete_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can delete this round'; end if;
  if r.status = 'cancelled' then return; end if;

  update rounds set status = 'cancelled' where id = p_round_id;

  if r.tee_time > now() then
    insert into notifications (user_id, type, round_id, actor_id)
    select rp.player_id, 'round_cancelled', p_round_id, auth.uid()
    from round_players rp
    where rp.round_id = p_round_id and rp.status in ('confirmed', 'waitlisted');
  end if;
end $$;

-- Blocking also takes them off my rounds' waitlists and invites (otherwise as in 0015)
create or replace function block_player(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r record;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_user = me then raise exception 'You can''t block yourself'; end if;
  if not exists (select 1 from profiles where id = p_user) then raise exception 'Player not found'; end if;

  insert into blocks (blocker_id, blocked_id) values (me, p_user) on conflict do nothing;

  update friendships set status = 'removed', accepted_at = null
   where least(requester_id, addressee_id) = least(me, p_user)
     and greatest(requester_id, addressee_id) = greatest(me, p_user);

  for r in
    select rp.round_id from round_players rp join rounds ro on ro.id = rp.round_id
     where ro.host_id = me and rp.player_id = p_user and rp.status in ('confirmed', 'requested', 'waitlisted', 'invited')
       and ro.status in ('open', 'full') and ro.tee_time > now()
  loop
    update round_players set status = 'declined' where round_id = r.round_id and player_id = p_user;
    perform refresh_round_status(r.round_id);
  end loop;

  delete from notifications where user_id = me and actor_id = p_user;
end $$;

-- Find: full rounds show too (to join the waitlist); not the ones I'm already in or waiting for
create or replace function find_rounds(
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
    greatest(r.max_players - count(rp.*) filter (where rp.status in ('host', 'confirmed')), 0)::int,
    r.max_players,
    r.host_id, h.display_name, h.handicap_index, r.approve_requests, r.format
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
