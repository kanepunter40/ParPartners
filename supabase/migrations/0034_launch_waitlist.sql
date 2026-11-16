-- Launch waitlist: people who leave their email on parpartners.app to hear when PARtners is on Google Play.
-- (Not the same as 0021_waitlist.sql, which is the queue for full rounds.)
--
-- Double opt-in: a row counts only once confirmed_at is set, after the person clicks the link in the
-- confirmation email. Unconfirmed rows are deleted after 30 days.
-- Only the launch-waitlist Edge Function reads or writes these tables (with the service role).
-- RLS is on with no policies, so the app and the website can't read or change them directly.

create table launch_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  lang text not null default 'en' check (lang in ('en', 'de')),
  -- Secret in the confirm and leave links. Changes each time a new confirmation email is sent.
  token uuid not null default gen_random_uuid() unique,
  created_at timestamptz not null default now(),
  -- When the last confirmation email went out (so a reload can't send dozens)
  sent_at timestamptz,
  confirmed_at timestamptz,
  -- When the launch email went out
  notified_at timestamptz,
  constraint launch_waitlist_email_ok check (length(email) between 3 and 254 and email = lower(email))
);
create unique index launch_waitlist_email on launch_waitlist (email);

-- Sign-up attempts per network, for rate limiting. Holds a keyed hash of the IP address, never the
-- address itself, and rows older than a day are deleted.
create table launch_waitlist_attempts (
  ip_hash text not null,
  at timestamptz not null default now()
);
create index launch_waitlist_attempts_ip on launch_waitlist_attempts (ip_hash, at);

alter table launch_waitlist enable row level security;
alter table launch_waitlist_attempts enable row level security;
revoke all on launch_waitlist, launch_waitlist_attempts from anon, authenticated;
