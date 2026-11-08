-- Hosts can delete a round. It is kept as status 'cancelled' (not removed) so the players'
-- "round cancelled" notification still shows which round it was, and scorecards keep their link.
-- Cancelled rounds already drop out of Find and invite links (both require open/full).

create function delete_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = p_round_id for update;
  if not found or r.host_id <> auth.uid() then raise exception 'Only the host can delete this round'; end if;
  if r.status = 'cancelled' then return; end if;

  update rounds set status = 'cancelled' where id = p_round_id;

  -- Only worth telling people about a round that hasn't happened yet
  if r.tee_time > now() then
    insert into notifications (user_id, type, round_id, actor_id)
    select rp.player_id, 'round_cancelled', p_round_id, auth.uid()
    from round_players rp
    where rp.round_id = p_round_id and rp.status = 'confirmed';
  end if;
end $$;

revoke execute on function delete_round(uuid) from public, anon;

-- Leaving a cancelled round is meaningless and shouldn't notify the host
create or replace function leave_round(p_round_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare r rounds;
begin
  select * into r from rounds where id = p_round_id;
  if not found then raise exception 'Round not available'; end if;
  if r.host_id = auth.uid() then raise exception 'Hosts delete the round instead'; end if;
  if r.status = 'cancelled' then return; end if;
  if r.tee_time <= now() then raise exception 'The round has already started'; end if;

  update round_players set status = 'withdrawn'
   where round_id = p_round_id and player_id = auth.uid() and status in ('confirmed', 'requested');
  if not found then return; end if;

  insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_left', p_round_id, auth.uid());
  perform refresh_round_status(p_round_id);
end $$;
