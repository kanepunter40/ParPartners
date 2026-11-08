-- Once the tee time has passed the line-up is fixed: no leaving, no joining (Find or invite link).

create or replace function leave_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = p_round_id;
  if not found then raise exception 'Round not available'; end if;
  if r.host_id = auth.uid() then raise exception 'Hosts cancel the round instead'; end if;
  if r.tee_time <= now() then raise exception 'The round has already started'; end if;

  update round_players set status = 'withdrawn'
   where round_id = p_round_id and player_id = auth.uid() and status in ('confirmed', 'requested');
  if not found then return; end if;

  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_left', p_round_id, auth.uid());
  perform refresh_round_status(p_round_id);
end $$;

create or replace function request_to_join(p_round_id uuid) returns player_status
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  current_status player_status;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found then raise exception 'Round not available'; end if;

  -- Already in (e.g. a double tap after the round filled up): nothing to do.
  select status into current_status from round_players where round_id = p_round_id and player_id = auth.uid();
  if current_status in ('host', 'confirmed') then return current_status; end if;

  if r.status <> 'open' then raise exception 'Round not available'; end if;
  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if r.visibility = 'invite_only' then raise exception 'Round is invite only'; end if;
  if spots_left(p_round_id) <= 0 then raise exception 'Round is full'; end if;

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
  select * into r from rounds where invite_code = p_invite_code and status in ('open', 'full');
  if not found then raise exception 'Invite not found'; end if;

  select status into current_status from round_players where round_id = r.id and player_id = auth.uid();
  if current_status in ('host', 'confirmed') then return r.id; end if;

  if r.tee_time <= now() then raise exception 'The round has already started'; end if;
  if spots_left(r.id) <= 0 then raise exception 'Round is full'; end if;
  insert into round_players (round_id, player_id, status) values (r.id, auth.uid(), 'confirmed')
    on conflict (round_id, player_id) do update set status = 'confirmed';
  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_joined', r.id, auth.uid());
  perform refresh_round_status(r.id);
  return r.id;
end $$;
