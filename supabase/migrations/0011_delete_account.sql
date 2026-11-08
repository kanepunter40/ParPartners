-- Players can delete their account (GDPR right to erasure). Deleting the auth user cascades to
-- the profile and everything that belongs only to them. Before that, anything other players
-- rely on is handed over or tidied up so their rounds and scorecards keep working.

create function delete_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  r record;
  next_host uuid;
begin
  if me is null then raise exception 'Not signed in'; end if;

  -- Upcoming rounds I host with other players in them: the longest-joined player takes over.
  -- Rounds with nobody else (and past ones) go with the account.
  for r in select id from rounds where host_id = me and status <> 'cancelled' and tee_time > now() loop
    select player_id into next_host from round_players
     where round_id = r.id and status = 'confirmed' order by created_at limit 1;
    if next_host is not null then
      update round_players set status = 'host' where round_id = r.id and player_id = next_host;
      update rounds set host_id = next_host where id = r.id;
      insert into notifications (user_id, type, round_id) values (next_host, 'host_handover', r.id);
    end if;
  end loop;

  -- Upcoming rounds I joined: leave them properly so the host hears and the spot reopens.
  for r in
    select rp.round_id, ro.host_id from round_players rp join rounds ro on ro.id = rp.round_id
     where rp.player_id = me and rp.status = 'confirmed' and ro.status <> 'cancelled' and ro.tee_time > now()
  loop
    update round_players set status = 'withdrawn' where round_id = r.round_id and player_id = me;
    insert into notifications (user_id, type, round_id, actor_id) values (r.host_id, 'player_left', r.round_id, me);
    perform refresh_round_status(r.round_id);
  end loop;

  -- Shared scorecards I started stay with the other app players on them.
  update scorecards s set created_by = (
      select sp.profile_id from scorecard_players sp
       where sp.scorecard_id = s.id and sp.profile_id is not null and sp.profile_id <> me
       order by sp.position limit 1)
   where s.created_by = me
     and exists (select 1 from scorecard_players sp
                  where sp.scorecard_id = s.id and sp.profile_id is not null and sp.profile_id <> me);

  -- My scores stay on other people's cards (their totals need them), without my name.
  update scorecard_players set name = 'Deleted player' where profile_id = me;

  delete from auth.users where id = me;
end $$;

revoke execute on function delete_account() from public, anon;
grant execute on function delete_account() to authenticated;
