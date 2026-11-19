-- The privacy policy promises feedback and course reports are deleted after 12 months at the latest.
-- A nightly job removes anything older (handled or not).

create function purge_old_feedback() returns void
language sql security definer set search_path = public as $$
  delete from app_feedback where created_at < now() - interval '12 months';
  delete from course_reports where created_at < now() - interval '12 months';
$$;
revoke execute on function purge_old_feedback() from public, anon, authenticated;

select cron.schedule('purge-old-feedback', '27 3 * * *', 'select public.purge_old_feedback()');
