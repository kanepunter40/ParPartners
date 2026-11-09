-- Push notifications.
-- Every new row in `notifications` is also sent to the player's phones: a trigger calls the `push` Edge
-- Function (supabase/functions/push) through pg_net, and that function sends it with Firebase Cloud Messaging.
-- A cron job adds a reminder the day before each round.
--
-- Setup (once): the Edge Function needs the FIREBASE_SERVICE_ACCOUNT secret (see the function's header).

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

-- Phones: the language to write the push in, and when the token was last confirmed
alter table device_tokens add column locale text not null default 'en' check (locale in ('en', 'de'));
alter table device_tokens add column updated_at timestamptz not null default now();
create unique index device_tokens_token_idx on device_tokens (token);

-- Saves this phone's token for me. A phone has one owner: if someone else signed in on it before, it moves to me.
create function register_device(p_token text, p_platform text, p_locale text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  delete from device_tokens where token = p_token and user_id <> auth.uid();
  insert into device_tokens (user_id, token, platform, locale)
  values (auth.uid(), p_token, p_platform, case when p_locale = 'de' then 'de' else 'en' end)
  on conflict (user_id, token) do update set locale = excluded.locale, platform = excluded.platform, updated_at = now();
end $$;

create function unregister_device(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from device_tokens where token = p_token and user_id = auth.uid();
$$;

revoke execute on function register_device(text, text, text), unregister_device(text) from public, anon;
grant execute on function register_device(text, text, text), unregister_device(text) to authenticated;

-- Shared secret between the trigger and the Edge Function, so nobody else can make the function send pushes
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'push_webhook_secret',
                           'Sent by the notifications trigger to the push Edge Function');

-- The Edge Function checks the secret with this (service role only)
create function push_webhook_secret() returns text
language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'push_webhook_secret';
$$;
revoke execute on function push_webhook_secret() from public, anon, authenticated;
grant execute on function push_webhook_secret() to service_role;

create function send_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Only if the player has a phone registered; never let a failed push block the notification itself
  if exists (select 1 from device_tokens where user_id = new.user_id) then
    perform net.http_post(
      url := 'https://lhfelwqznsmzwmhgxlpi.supabase.co/functions/v1/push',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', push_webhook_secret()),
      body := jsonb_build_object('id', new.id),
      timeout_milliseconds := 5000
    );
  end if;
  return new;
exception when others then
  return new;
end $$;
revoke execute on function send_push() from public, anon, authenticated;

create trigger notifications_send_push after insert on notifications
  for each row execute function send_push();

-- Reminders: once per player per round, sent during the 24 hours before tee time (but not in the last hour).
-- Skipped for rounds posted less than 12 hours before they start: everyone just saw them.
create function queue_round_reminders() returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, round_id)
  select rp.player_id, 'round_reminder', r.id
  from rounds r
  join round_players rp on rp.round_id = r.id and rp.status in ('host', 'confirmed')
  where r.status in ('open', 'full')
    and r.tee_time > now() + interval '1 hour'
    and r.tee_time <= now() + interval '24 hours'
    and r.created_at < r.tee_time - interval '12 hours'
    and not exists (select 1 from notifications n
                     where n.user_id = rp.player_id and n.round_id = r.id and n.type = 'round_reminder');
$$;
revoke execute on function queue_round_reminders() from public, anon, authenticated;

select cron.schedule('round-reminders', '*/15 * * * *', 'select public.queue_round_reminders()');
