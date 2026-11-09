-- Round chat: a message thread for the host and confirmed players of a round
-- ("meet at the pro shop?", "running 10 min late"). New messages come in live (Supabase Realtime)
-- and notify the other players, at most once per round every 10 minutes while unread.

-- Notifications can carry a short text: the start of a chat message, shown in the push
alter table notifications add column detail text check (char_length(detail) <= 200);

create table round_messages (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references rounds(id) on delete cascade,
  sender_id   uuid references profiles(id) on delete set null,
  body        text not null check (char_length(trim(body)) between 1 and 1000),
  created_at  timestamptz not null default now()
);
create index round_messages_round_idx on round_messages (round_id, created_at);

-- In the line-up (host or confirmed): can read and write the chat
create function is_round_member(rid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from round_players
                  where round_id = rid and player_id = auth.uid() and status in ('host', 'confirmed'));
$$;
revoke execute on function is_round_member(uuid) from public, anon;
grant execute on function is_round_member(uuid) to authenticated;

alter table round_messages enable row level security;
-- Messages from players I blocked (or who blocked me) are hidden
create policy round_messages_read on round_messages for select to authenticated
  using (is_round_member(round_id) and (sender_id is null or sender_id not in (select blocked_ids())));
create policy round_messages_insert on round_messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and is_round_member(round_id)
              and exists (select 1 from rounds r where r.id = round_id and r.status <> 'cancelled'));
revoke all on round_messages from anon;
grant select, insert on round_messages to authenticated;

-- Slows down floods: at most 20 messages a minute per player per round
create function check_round_message_rate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.body := trim(new.body);
  new.created_at := now();
  if (select count(*) from round_messages where round_id = new.round_id and sender_id = new.sender_id
        and created_at > now() - interval '1 minute') >= 20 then
    raise exception 'Slow down a little';
  end if;
  return new;
end $$;
revoke execute on function check_round_message_rate() from public, anon, authenticated;
create trigger round_messages_rate before insert on round_messages
  for each row execute function check_round_message_rate();

create function notify_round_message() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, round_id, actor_id, detail)
  select rp.player_id, 'round_message', new.round_id, new.sender_id, left(new.body, 140)
  from round_players rp
  where rp.round_id = new.round_id and rp.status in ('host', 'confirmed') and rp.player_id <> new.sender_id
    and not exists (select 1 from blocks b
                     where (b.blocker_id = rp.player_id and b.blocked_id = new.sender_id)
                        or (b.blocker_id = new.sender_id and b.blocked_id = rp.player_id))
    and not exists (select 1 from notifications n
                     where n.user_id = rp.player_id and n.round_id = new.round_id and n.type = 'round_message'
                       and n.read_at is null and n.created_at > now() - interval '10 minutes');
  return new;
exception when others then
  return new;  -- never lose a message over a notification
end $$;
revoke execute on function notify_round_message() from public, anon, authenticated;
create trigger round_messages_notify after insert on round_messages
  for each row execute function notify_round_message();

-- Live updates in the app
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  alter publication supabase_realtime add table round_messages;
end $$;
