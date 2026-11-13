-- Notification settings: which kinds of push a player has turned off.
-- Stored as groups (not single notification types) so the Settings screen and the push
-- function agree on one short list. Turned-off groups still appear in the in-app list;
-- only the push to the phone is skipped (see supabase/functions/push).
-- report_received (admin) has no group and is always sent.

create table notification_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  muted text[] not null default '{}'
    check (muted <@ array['your_rounds', 'joining', 'changes', 'reminders', 'chat', 'friends', 'searches']::text[]),
  updated_at timestamptz not null default now()
);

alter table notification_settings enable row level security;

-- Each player reads and writes only their own row. The push function uses the service role.
create policy notification_settings_select on notification_settings for select
  to authenticated using ((select auth.uid()) = user_id);
create policy notification_settings_insert on notification_settings for insert
  to authenticated with check ((select auth.uid()) = user_id);
create policy notification_settings_update on notification_settings for update
  to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on notification_settings to authenticated;
