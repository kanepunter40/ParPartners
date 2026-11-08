-- Every round is instant-join: tapping "Join round" in Find confirms you straight away,
-- like an invite link. Players can still leave. The host no longer approves anyone.
-- rounds.approve_requests is now unused (kept to avoid recreating find_rounds);
-- respond_to_request only matters for requests made before this change.

alter table rounds alter column approve_requests set default false;
update rounds set approve_requests = false where approve_requests;

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
