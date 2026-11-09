-- Report alerts: every new report notifies the app's admins (in the app and as a push), so reports
-- get looked at within the 24 hours the report screen promises. Review them in the `reports` table.

create table admins (
  user_id     uuid primary key references profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);
-- Nobody reads or changes this from the app; manage it in the dashboard.
alter table admins enable row level security;
revoke all on admins from anon, authenticated;

insert into admins (user_id)
select id from auth.users where email = 'kanepunter40@gmail.com'
on conflict do nothing;

-- The reported player is the notification's "actor", so the alert reads "New report about Lena".
-- The reporter stays out of the notification; their id is in the reports row.
create function notify_admins_of_report() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (user_id, type, round_id, actor_id)
  select a.user_id, 'report_received', new.round_id, new.reported_id
  from admins a
  where a.user_id is distinct from new.reported_id;  -- a report about an admin goes to the other admins
  return new;
end $$;
revoke execute on function notify_admins_of_report() from public, anon, authenticated;

create trigger reports_notify_admins after insert on reports
  for each row execute function notify_admins_of_report();
