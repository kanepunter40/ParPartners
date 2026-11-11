-- Errors the app runs into on testers' phones, so we hear about them without a tester having to.
-- Kept in our own database (no extra third-party processor). Nobody can read them from the app:
-- look at them in the Supabase dashboard. Deleted after 90 days, and with the account.
--  * Written only through report_client_error(), which trims every field and caps how many
--    rows one player (or all signed-out users together) can add per hour.

create table client_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users (id) on delete cascade,
  message text not null,
  stack text,
  route text,
  app_version text,
  platform text,
  device text
);
create index client_errors_created_at on client_errors (created_at desc);
create index client_errors_user on client_errors (user_id, created_at desc);
alter table client_errors enable row level security; -- no policies: the app can't read or write it directly
revoke all on client_errors from anon, authenticated;

create function report_client_error(
  p_message text, p_stack text, p_route text, p_app_version text, p_platform text, p_device text
) returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  recent int;
begin
  if coalesce(trim(p_message), '') = '' then return; end if;
  if me is null then
    select count(*) into recent from client_errors where user_id is null and created_at > now() - interval '1 hour';
    if recent >= 500 then return; end if;
  else
    select count(*) into recent from client_errors where user_id = me and created_at > now() - interval '1 hour';
    if recent >= 30 then return; end if;
  end if;
  insert into client_errors (user_id, message, stack, route, app_version, platform, device)
  values (me, left(p_message, 1000), left(p_stack, 4000), left(p_route, 200),
          left(p_app_version, 40), left(p_platform, 20), left(p_device, 200));
end;
$$;
revoke all on function report_client_error from public;
grant execute on function report_client_error to anon, authenticated;

create function purge_client_errors() returns void
language sql security definer set search_path = public as $$
  delete from client_errors where created_at < now() - interval '90 days';
$$;
revoke all on function purge_client_errors from public, anon, authenticated;
select cron.schedule('purge-client-errors', '17 3 * * *', 'select public.purge_client_errors()');
