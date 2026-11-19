-- Players can tell us about course problems, ask for missing courses and send feedback from inside the app.
-- Each one lands in a table you review in the dashboard, and the admins get an alert (in the app and as a push),
-- like the player reports in 0017_report_alerts.sql.
--
-- Wrong pars from the course data (source 'osm') can't be changed in the app. A player suggests the right par instead;
-- once two players who have a scorecard on that course suggest the same par, it changes for everyone (source 'fix').
-- 'fix' pars are locked like 'osm' ones, and the hole import only ever updates 'osm' rows, so it never undoes a fix.

alter table course_holes drop constraint course_holes_source_check;
alter table course_holes add constraint course_holes_source_check check (source in ('osm', 'player', 'fix'));

create table course_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_id    uuid references profiles(id) on delete set null,
  -- null for a missing course
  course_id      uuid references courses(id) on delete cascade,
  kind           text not null check (kind in ('wrong_par', 'wrong_details', 'closed', 'other', 'missing_course')),
  hole           smallint check (hole between 1 and 27),
  suggested_par  smallint check (suggested_par between 3 and 6),
  -- a missing course: its name and town as the player typed them
  course_name    text check (char_length(course_name) <= 120),
  place          text check (char_length(place) <= 120),
  details        text check (char_length(details) <= 1000),
  status         text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at     timestamptz not null default now(),
  check ((kind = 'missing_course') = (course_id is null)),
  check (kind <> 'missing_course' or char_length(trim(course_name)) > 0),
  check (kind <> 'wrong_par' or (hole is not null and suggested_par is not null))
);
create index course_reports_open_idx on course_reports (created_at desc) where status = 'open';
create index course_reports_par_idx on course_reports (course_id, hole, suggested_par) where kind = 'wrong_par' and status = 'open';
create index course_reports_reporter_idx on course_reports (reporter_id, created_at desc);

alter table course_reports enable row level security;
revoke all on course_reports from anon, authenticated;

create table app_feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references profiles(id) on delete set null,
  message      text not null check (char_length(message) between 1 and 2000),
  app_version  text check (char_length(app_version) <= 40),
  platform     text check (char_length(platform) <= 20),
  device       text check (char_length(device) <= 200),
  status       text not null default 'open' check (status in ('open', 'done')),
  created_at   timestamptz not null default now()
);
create index app_feedback_open_idx on app_feedback (created_at desc) where status = 'open';
create index app_feedback_user_idx on app_feedback (user_id, created_at desc);

alter table app_feedback enable row level security;
revoke all on app_feedback from anon, authenticated;

-- Alerts to the admins. The player who sent it is the "actor" ("Feedback from Lena: …"); `detail` holds the course or text.
create function notify_admins(p_type text, p_actor uuid, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into notifications (user_id, type, actor_id, detail)
  select a.user_id, p_type, p_actor, left(p_detail, 200) from admins a where a.user_id is distinct from p_actor;
$$;
revoke execute on function notify_admins(text, uuid, text) from public, anon, authenticated;

-- A problem with a course. Returns 'applied' when a suggested par changed the course for everyone, else 'received'.
create function report_course(p_course_id uuid, p_kind text, p_hole integer default null, p_par integer default null, p_details text default null)
returns text
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  course_name text;
  current_source text;
  agree integer;
begin
  if me is null then raise exception 'Not signed in'; end if;
  if p_kind not in ('wrong_par', 'wrong_details', 'closed', 'other') then raise exception 'Unknown problem'; end if;
  select name into course_name from courses where id = p_course_id;
  if course_name is null then raise exception 'Course not found'; end if;
  if (select count(*) from course_reports where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You''ve sent a lot of course reports today. Try again tomorrow.';
  end if;
  if p_kind = 'wrong_par' and (p_hole is null or p_hole not between 1 and 27 or p_par is null or p_par not between 3 and 6) then
    raise exception 'Pick a hole and a par';
  end if;

  -- One open suggestion per player and hole: a new one replaces the old
  if p_kind = 'wrong_par' then
    delete from course_reports where reporter_id = me and course_id = p_course_id and hole = p_hole
       and kind = 'wrong_par' and status = 'open';
  end if;

  insert into course_reports (reporter_id, course_id, kind, hole, suggested_par, details)
  values (me, p_course_id, p_kind,
          case when p_kind = 'wrong_par' then p_hole end,
          case when p_kind = 'wrong_par' then p_par end,
          nullif(left(trim(coalesce(p_details, '')), 1000), ''));

  if p_kind = 'wrong_par' then
    select source into current_source from course_holes where course_id = p_course_id and hole = p_hole;
    -- Two players who have a scorecard on this course agree: the par changes for everyone
    select count(distinct r.reporter_id) into agree
      from course_reports r
     where r.course_id = p_course_id and r.hole = p_hole and r.suggested_par = p_par
       and r.kind = 'wrong_par' and r.status = 'open'
       and exists (select 1 from scorecards s join scorecard_players sp on sp.scorecard_id = s.id
                    where s.course_id = p_course_id and sp.profile_id = r.reporter_id);
    if agree >= 2 then
      insert into course_holes (course_id, hole, par, source, updated_by)
      values (p_course_id, p_hole, p_par, 'fix', me)
      on conflict (course_id, hole) do update
        set par = excluded.par, source = 'fix', updated_by = excluded.updated_by, updated_at = now();
      update course_reports set status = 'actioned'
       where course_id = p_course_id and hole = p_hole and kind = 'wrong_par' and status = 'open';
      perform notify_admins('course_report', me, course_name || ': par ' || p_par || ' on hole ' || p_hole || ' (changed, 2 players agreed)');
      return 'applied';
    end if;
    perform notify_admins('course_report', me, course_name || ': par ' || p_par || ' on hole ' || p_hole
      || case when current_source is null then '' else ' (now ' || (select par from course_holes where course_id = p_course_id and hole = p_hole) || ')' end);
  else
    perform notify_admins('course_report', me, course_name || ': ' || replace(p_kind, '_', ' '));
  end if;
  return 'received';
end $$;
revoke execute on function report_course(uuid, text, integer, integer, text) from public, anon;
grant execute on function report_course(uuid, text, integer, integer, text) to authenticated;

-- A course that isn't in the app yet.
create function request_course(p_name text, p_place text default null, p_details text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  n text := left(trim(coalesce(p_name, '')), 120);
  pl text := nullif(left(trim(coalesce(p_place, '')), 120), '');
begin
  if me is null then raise exception 'Not signed in'; end if;
  if n = '' then raise exception 'Enter the course name'; end if;
  if (select count(*) from course_reports where reporter_id = me and created_at > now() - interval '1 day') >= 20 then
    raise exception 'You''ve sent a lot of course reports today. Try again tomorrow.';
  end if;
  insert into course_reports (reporter_id, kind, course_name, place, details)
  values (me, 'missing_course', n, pl, nullif(left(trim(coalesce(p_details, '')), 1000), ''));
  perform notify_admins('course_request', me, n || coalesce(', ' || pl, ''));
end $$;
revoke execute on function request_course(text, text, text) from public, anon;
grant execute on function request_course(text, text, text) to authenticated;

-- Feedback about the app, with the build and phone it came from.
create function send_feedback(p_message text, p_version text default null, p_platform text default null, p_device text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  m text := left(trim(coalesce(p_message, '')), 2000);
begin
  if me is null then raise exception 'Not signed in'; end if;
  if m = '' then raise exception 'Write a message first'; end if;
  if (select count(*) from app_feedback where user_id = me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve sent a lot of feedback today. Try again tomorrow.';
  end if;
  insert into app_feedback (user_id, message, app_version, platform, device)
  values (me, m, left(p_version, 40), left(p_platform, 20), left(p_device, 200));
  perform notify_admins('feedback_received', me, m);
end $$;
revoke execute on function send_feedback(text, text, text, text) from public, anon;
grant execute on function send_feedback(text, text, text, text) to authenticated;

-- Corrected pars ('fix') are locked like the course data
create or replace function public.set_hole_par(p_course_id uuid, p_hole integer, p_par integer)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $$
begin
  if not exists (
    select 1 from scorecards s
    where s.course_id = p_course_id and is_scorecard_member(s.id)
  ) then raise exception 'Start a scorecard on this course first'; end if;
  if exists (select 1 from course_holes where course_id = p_course_id and hole = p_hole and source in ('osm', 'fix')) then
    raise exception 'This par comes from the course data';
  end if;

  insert into course_holes (course_id, hole, par, source, updated_by)
  values (p_course_id, p_hole, p_par, 'player', auth.uid())
  on conflict (course_id, hole) do update
    set par = excluded.par, source = 'player', updated_by = excluded.updated_by, updated_at = now();
end $$;
