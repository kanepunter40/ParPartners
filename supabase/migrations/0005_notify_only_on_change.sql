-- Only write a notification when the call actually changed something.
-- Before: a host could send "request accepted" to any user id, and repeat calls
-- (double taps, re-requests) sent duplicate notifications.

create or replace function request_to_join(p_round_id uuid) returns player_status
language plpgsql security definer set search_path = public as $$
declare
  r rounds;
  new_status player_status;
  current_status player_status;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found or r.status <> 'open' then raise exception 'Round not available'; end if;
  if r.visibility = 'invite_only' then raise exception 'Round is invite only'; end if;

  select status into current_status from round_players where round_id = p_round_id and player_id = auth.uid();
  if current_status in ('host', 'confirmed', 'requested') then return current_status; end if;

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

create or replace function respond_to_request(p_round_id uuid, p_player_id uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_round_host(p_round_id) then raise exception 'Only the host can respond'; end if;
  if p_accept and spots_left(p_round_id) <= 0 then raise exception 'Round is full'; end if;

  update round_players
     set status = case when p_accept then 'confirmed' else 'declined' end::player_status
   where round_id = p_round_id and player_id = p_player_id and status = 'requested';
  if not found then raise exception 'Request not found'; end if;

  insert into notifications (user_id, type, round_id, actor_id)
  values (p_player_id, case when p_accept then 'request_accepted' else 'request_declined' end, p_round_id, auth.uid());

  perform refresh_round_status(p_round_id);
end $$;

create or replace function leave_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = p_round_id;
  if not found then raise exception 'Round not available'; end if;
  if r.host_id = auth.uid() then raise exception 'Hosts cancel the round instead'; end if;

  update round_players set status = 'withdrawn'
   where round_id = p_round_id and player_id = auth.uid() and status in ('confirmed', 'requested');
  if not found then return; end if;

  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_left', p_round_id, auth.uid());
  perform refresh_round_status(p_round_id);
end $$;
