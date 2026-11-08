-- Opening an invite link for a round you are already in (as host or confirmed player)
-- is a no-op: the host is not demoted, no "full" error, no duplicate notification.
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

  if spots_left(r.id) <= 0 then raise exception 'Round is full'; end if;
  insert into round_players (round_id, player_id, status) values (r.id, auth.uid(), 'confirmed')
    on conflict (round_id, player_id) do update set status = 'confirmed';
  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_joined', r.id, auth.uid());
  perform refresh_round_status(r.id);
  return r.id;
end $$;
